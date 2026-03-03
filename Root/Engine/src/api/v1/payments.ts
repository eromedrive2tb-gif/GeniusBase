/**
 * Public BaaS Payments Route — Webhook handler
 * Root/Engine/src/api/v1/payments.ts
 *
 * POST /api/v1/payments/charges   → legacy single-charge flow (Phase 12 compat)
 * POST /api/v1/payments/webhooks/:provider → PUBLIC — called by Woovi/Stripe
 *
 * Webhook flow (Phase 13):
 *   1. Lookup tenant_transactions by provider_transaction_id (= correlationID = order_id)
 *   2. ACID batch: UPDATE transactions → COMPLETED + UPDATE orders → PAID
 *   3. Fetch enriched order payload
 *   4. Dual broadcast ORDER_PAID:
 *      → REALTIME_STATE   (client SDK on checkout screen)
 *      → DASHBOARD_RPC_STATE (admin dashboard live view)
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { getProvider } from '../../payments/registry'

const paymentsRoute = createAuthRouter()

// ── POST /charges (Phase 12 compat — single charge without order) ───

paymentsRoute.post('/charges', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId') as string

    let body: { provider?: unknown; amount?: unknown; metadata?: unknown }
    try { body = await c.req.json() } catch {
        return c.json({ error: 'Body must be valid JSON' }, 400)
    }

    const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
    const amount = typeof body.amount === 'number' ? body.amount : NaN

    if (!provider) return c.json({ error: '"provider" (string) is required' }, 400)
    if (!Number.isInteger(amount) || amount <= 0)
        return c.json({ error: '"amount" must be a positive integer (in cents)' }, 400)

    let gateway
    try { gateway = getProvider(provider) }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Unknown provider' }, 400)
    }

    const gatewayRow = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways
         WHERE tenant_id = ? AND provider = ? AND is_active = 1`
    ).bind(tenantId, provider).first<{ credentials: string }>()

    if (!gatewayRow) {
        return c.json({
            error: `Gateway "${provider}" not configured. Add credentials in Dashboard → Gateways.`,
        }, 422)
    }

    let creds: Record<string, unknown>
    try { creds = JSON.parse(gatewayRow.credentials) as Record<string, unknown> }
    catch { return c.json({ error: 'Malformed gateway credentials' }, 500) }

    const rawAppId = typeof creds.appId === 'string' ? creds.appId.trim() : ''
    if (!rawAppId) return c.json({ error: 'Gateway credential "appId" is missing' }, 422)
    const appId = creds.sandbox === true ? `sandbox|${rawAppId}` : rawAppId

    const correlationID = `gb_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    let chargeResult
    try {
        chargeResult = await gateway.createCharge(
            { correlationID, amount, comment: 'Cobrança via GeniusBase' },
            appId,
        )
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gateway error'
        return c.json({ error: msg }, 502)
    }

    const id = `chg_${crypto.randomUUID().replace(/-/g, '')}`
    const metadataStr = JSON.stringify(body.metadata ?? {})
    try {
        await c.env.DB.prepare(
            `INSERT INTO tenant_charges
             (id, tenant_id, provider, provider_charge_id, amount, status, metadata, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, tenantId, provider, chargeResult.providerChargeId, amount, chargeResult.status, metadataStr, now, now).run()
    } catch (err) {
        console.error('[payments] D1 insert failed:', err)
        return c.json({ error: 'Failed to persist charge' }, 500)
    }

    return c.json({
        success: true,
        data: {
            id, provider,
            provider_charge_id: chargeResult.providerChargeId,
            amount, status: chargeResult.status,
            brCode: chargeResult.brCode,
            created_at: now,
        },
    }, 201)
})

// ── POST /webhooks/:provider ───────────────────────────────────────────
// PUBLIC — Woovi/Stripe call this. Must respond 200 fast or they retry.

paymentsRoute.post('/webhooks/:provider', async (c) => {
    const providerName = c.req.param('provider')

    let gateway
    try { gateway = getProvider(providerName) } catch {
        console.warn(`[webhook] Unknown provider: ${providerName}`)
        return c.json({ ok: true }, 200)
    }

    let body: unknown
    try { body = await c.req.json() } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const event = await gateway.parseWebhook(body)

    // ── CHARGE_COMPLETED ────────────────────────────────────────
    if (event.type === 'CHARGE_COMPLETED' && event.providerChargeId) {
        const now = new Date().toISOString()

        // Phase 13 path: look up the transaction (created by POST /api/v1/orders)
        const txn = await c.env.DB.prepare(
            `SELECT id, tenant_id, order_id, amount, customer_id
             FROM tenant_transactions
             WHERE provider_transaction_id = ? AND status = 'PENDING'
             LIMIT 1`
        ).bind(event.providerChargeId)
            .first<{ id: string; tenant_id: string; order_id: string; amount: number; customer_id: string | null }>()

        if (txn) {
            // Include payer data in the update
            const pName = event.payer_name ?? null
            const pDoc = event.payer_document ?? null

            // Passive CRM Capture (Identify or Insert the Customer)
            let finalCustomerId = txn.customer_id
            if (!finalCustomerId && pDoc) {
                // Try to find the customer by document or email in this tenant
                const existingCustomer = await c.env.DB.prepare(
                    `SELECT id FROM tenant_customers WHERE tenant_id = ? AND (document = ? OR email = ?)`
                ).bind(txn.tenant_id, pDoc, event.payer_email ?? pDoc).first<{ id: string }>()

                if (existingCustomer) {
                    finalCustomerId = existingCustomer.id
                } else {
                    // Automatically insert new customer
                    const newCustomerId = `cus_${crypto.randomUUID().replace(/-/g, '')}`
                    await c.env.DB.prepare(
                        `INSERT INTO tenant_customers (id, tenant_id, name, document, email, created_at)
                         VALUES (?, ?, ?, ?, ?, ?)`
                    ).bind(newCustomerId, txn.tenant_id, pName ?? 'Cliente Anônimo', pDoc, event.payer_email ?? null, now).run()
                    finalCustomerId = newCustomerId
                }
            }

            // ACID batch: mark transaction (+ order if linked) as paid atomically, tracking the customer_id
            const statements = [
                c.env.DB.prepare(
                    `UPDATE tenant_transactions 
                     SET status = 'COMPLETED', payer_name = ?, payer_document = ?, customer_id = ?
                     WHERE id = ?`
                ).bind(pName, pDoc, finalCustomerId, txn.id)
            ]

            if (txn.order_id) {
                statements.push(
                    c.env.DB.prepare(
                        `UPDATE tenant_orders SET status = 'PAID', updated_at = ?, customer_id = ? WHERE id = ?`
                    ).bind(now, finalCustomerId, txn.order_id)
                )
            }

            await c.env.DB.batch(statements)

            // ── Broadcast Logic ─────────────────────────────────────────

            // 1. If it's an E-commerce Order, fetch details and broadcast ORDER_PAID
            if (txn.order_id) {
                const order = await c.env.DB.prepare(
                    `SELECT id, tenant_id, customer_id, status, total_amount, created_at, updated_at
                     FROM tenant_orders WHERE id = ?`
                ).bind(txn.order_id)
                    .first<{ id: string; tenant_id: string; customer_id: string | null; status: string; total_amount: number; created_at: string; updated_at: string }>()

                const { results: orderItems } = await c.env.DB.prepare(
                    `SELECT product_id, quantity, price_at_time
                     FROM tenant_order_items WHERE order_id = ?`
                ).bind(txn.order_id).all()

                const orderPayload = {
                    order_id: txn.order_id,
                    transaction_id: txn.id,
                    tenant_id: txn.tenant_id,
                    total_amount: order?.total_amount ?? txn.amount,
                    status: 'PAID',
                    provider: providerName,
                    provider_transaction_id: event.providerChargeId,
                    items: orderItems,
                    payer_name: pName,
                    payer_document: pDoc,
                    updated_at: now,
                }

                try {
                    const realtimeId = c.env.REALTIME_STATE.idFromName(txn.tenant_id)
                    await c.env.REALTIME_STATE.get(realtimeId).broadcast(
                        JSON.stringify({ type: 'PUSH', event: 'ORDER_PAID', payload: orderPayload })
                    )
                } catch { /* ignore */ }

                try {
                    const dashboardId = c.env.DASHBOARD_RPC_STATE.idFromName(txn.tenant_id)
                    await c.env.DASHBOARD_RPC_STATE.get(dashboardId).push('ORDER_PAID', orderPayload)
                } catch { /* admin offline */ }
            }

            // 2. ALWAYS broadcast TRANSACTION_COMPLETED (for standalone PIX / general tracking)
            const trxPayload = {
                transaction_id: txn.id,
                tenant_id: txn.tenant_id,
                order_id: txn.order_id,
                amount: txn.amount,
                status: 'COMPLETED',
                provider: providerName,
                payer_name: pName,
                payer_document: pDoc,
                updated_at: now,
            }

            try {
                const realtimeId = c.env.REALTIME_STATE.idFromName(txn.tenant_id)
                await c.env.REALTIME_STATE.get(realtimeId).broadcast(
                    JSON.stringify({ type: 'PUSH', event: 'TRANSACTION_COMPLETED', payload: trxPayload })
                )
            } catch { /* ignore */ }

            try {
                const dashboardId = c.env.DASHBOARD_RPC_STATE.idFromName(txn.tenant_id)
                await c.env.DASHBOARD_RPC_STATE.get(dashboardId).push('TRANSACTION_COMPLETED', trxPayload)
            } catch { /* admin offline */ }

        } else {
            // Phase 12 fallback: legacy tenant_charges (single charge, no order)
            const row = await c.env.DB.prepare(
                `UPDATE tenant_charges SET status = 'COMPLETED', updated_at = ?
                 WHERE provider_charge_id = ?
                 RETURNING id, tenant_id, provider, amount`
            ).bind(Math.floor(Date.now() / 1000), event.providerChargeId)
                .first<{ id: string; tenant_id: string; provider: string; amount: number }>()

            if (row) {
                const legacyPayload = {
                    id: row.id, tenant_id: row.tenant_id, provider: row.provider,
                    provider_charge_id: event.providerChargeId, amount: row.amount,
                    status: 'COMPLETED',
                }
                try {
                    const realtimeId = c.env.REALTIME_STATE.idFromName(row.tenant_id)
                    await c.env.REALTIME_STATE.get(realtimeId).broadcast(
                        JSON.stringify({ type: 'PUSH', event: 'CHARGE_COMPLETED', payload: legacyPayload })
                    )
                } catch { /* admin offline */ }
            }
        }
    }

    // ── CHARGE_FAILED ───────────────────────────────────────────
    if (event.type === 'CHARGE_FAILED' && event.providerChargeId) {
        await c.env.DB.batch([
            c.env.DB.prepare(
                `UPDATE tenant_transactions SET status = 'FAILED'
                 WHERE provider_transaction_id = ?`
            ).bind(event.providerChargeId),
            c.env.DB.prepare(
                `UPDATE tenant_charges SET status = 'FAILED', updated_at = ?
                 WHERE provider_charge_id = ?`
            ).bind(Math.floor(Date.now() / 1000), event.providerChargeId),
        ])
    }

    return c.json({ ok: true }, 200)
})

export { paymentsRoute }
