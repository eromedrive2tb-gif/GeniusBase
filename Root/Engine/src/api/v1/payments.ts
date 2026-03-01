/**
 * Public BaaS Payments Route — Agnostic Payment Engine
 * Root/Engine/src/api/v1/payments.ts
 *
 * Responsabilidade única: Orquestrar criação de cobranças e recepção de webhooks.
 * Nenhuma lógica de gateway aqui — delega tudo para o Registry Pattern.
 *
 * Endpoints:
 *   POST /api/v1/payments/charges           → apiKeyAuth (service) → cria cobrança
 *   POST /api/v1/payments/webhooks/:provider → PUBLIC  → Woovi/Stripe chamam isso
 */

import { Hono } from 'hono'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { getProvider } from '../../payments/registry'

const paymentsRoute = new Hono<{ Bindings: Env }>()

// ─── POST /charges ───────────────────────────────────────────

paymentsRoute.post('/charges', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId' as never) as string

    let body: { provider?: unknown; amount?: unknown; metadata?: unknown }
    try { body = await c.req.json() } catch {
        return c.json({ error: 'Body must be valid JSON' }, 400)
    }

    const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
    const amount = typeof body.amount === 'number' ? body.amount : NaN

    if (!provider) return c.json({ error: '"provider" (string) is required' }, 400)
    if (!Number.isInteger(amount) || amount <= 0)
        return c.json({ error: '"amount" must be a positive integer (in cents)' }, 400)

    // Resolve gateway (throws if unknown provider)
    let gateway
    try { gateway = getProvider(provider) }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Unknown provider' }, 400)
    }

    // ── Fetch tenant-specific credentials from D1 ─────────────────
    // Each Tenant must configure their OWN gateway credentials in the Dashboard.
    // Never use a global/infra credential — that would be a critical isolation breach.
    const gatewayRow = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways
         WHERE tenant_id = ? AND provider = ? AND is_active = 1`
    ).bind(tenantId, provider)
        .first<{ credentials: string }>()

    if (!gatewayRow) {
        return c.json({
            error: `Gateway "${provider}" not configured for this tenant. ` +
                `Please add your credentials in Dashboard → Gateways.`,
        }, 422)
    }

    let creds: Record<string, unknown>
    try { creds = JSON.parse(gatewayRow.credentials) as Record<string, unknown> }
    catch { return c.json({ error: 'Malformed gateway credentials in database' }, 500) }

    const rawAppId = typeof creds.appId === 'string' ? creds.appId.trim() : ''
    if (!rawAppId) return c.json({ error: 'Gateway credential "appId" is missing' }, 422)

    // Prefix with 'sandbox|' so the OpenPixProvider selects the correct base URL.
    // Sandbox credentials (created in app.woovi.com under a sandbox project) must
    // have { appId, sandbox: true } to hit api.woovi-sandbox.com instead of production.
    const appId = creds.sandbox === true ? `sandbox|${rawAppId}` : rawAppId

    // Build correlation ID — used to idempotently identify this charge
    const correlationID = `gb_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    // Call the gateway with tenant's own credential
    let chargeResult
    try {
        chargeResult = await gateway.createCharge(
            { correlationID, amount, comment: 'Cobrança via GeniusBase' },
            appId
        )
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gateway error'
        console.error(`[payments] ${provider} createCharge failed:`, msg)
        return c.json({ error: msg }, 502)
    }

    // Persist in tenant_charges
    const id = `chg_${crypto.randomUUID().replace(/-/g, '')}`
    const metadataStr = JSON.stringify(body.metadata ?? {})

    try {
        await c.env.DB.prepare(
            `INSERT INTO tenant_charges
             (id, tenant_id, provider, provider_charge_id, amount, status, metadata, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, tenantId, provider,
            chargeResult.providerChargeId,
            amount, chargeResult.status,
            metadataStr, now, now
        ).run()
    } catch (err) {
        console.error('[payments] D1 insert failed:', err)
        return c.json({ error: 'Failed to persist charge' }, 500)
    }

    return c.json({
        success: true,
        data: {
            id,
            provider,
            provider_charge_id: chargeResult.providerChargeId,
            amount,
            status: chargeResult.status,
            brCode: chargeResult.brCode,
            created_at: now,
        },
    }, 201)
})

// ─── POST /webhooks/:provider ────────────────────────────────
// PUBLIC — called by Woovi/Stripe. Must return 200 quickly or they retry.

paymentsRoute.post('/webhooks/:provider', async (c) => {
    const providerName = c.req.param('provider')

    let gateway
    try { gateway = getProvider(providerName) }
    catch {
        // Unknown provider — return 200 so external service stops retrying
        console.warn(`[webhook] Unknown provider: ${providerName}`)
        return c.json({ ok: true }, 200)
    }

    let body: unknown
    try { body = await c.req.json() } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const event = await gateway.parseWebhook(body)

    if (event.type === 'CHARGE_COMPLETED' && event.providerChargeId) {
        const now = Math.floor(Date.now() / 1000)

        // Update charge status and fetch tenant_id in one round-trip
        const row = await c.env.DB.prepare(
            `UPDATE tenant_charges SET status = 'COMPLETED', updated_at = ?
             WHERE provider_charge_id = ?
             RETURNING id, tenant_id, provider, amount`
        ).bind(now, event.providerChargeId)
            .first<{ id: string; tenant_id: string; provider: string; amount: number }>()

        if (row) {
            const record = {
                id: row.id,
                tenant_id: row.tenant_id,
                provider: row.provider,
                provider_charge_id: event.providerChargeId,
                amount: row.amount,
                status: 'COMPLETED',
                updated_at: now,
            }

            // ── Dual Broadcast ────────────────────────────────────────────
            // 1. REALTIME_STATE (public WS) → client app on checkout screen
            //    broadcast() takes a raw JSON string — serialize PUSH envelope
            // 2. DASHBOARD_RPC_STATE (admin WS tunnel) → admin dashboard live table
            try {
                const realtimeId = c.env.REALTIME_STATE.idFromName(row.tenant_id)
                const realtimeStub = c.env.REALTIME_STATE.get(realtimeId)
                await realtimeStub.broadcast(
                    JSON.stringify({ type: 'PUSH', event: 'CHARGE_COMPLETED', payload: record })
                )
            } catch (err) {
                console.warn('[webhook] REALTIME_STATE broadcast failed:', err)
            }

            try {
                const dashboardId = c.env.DASHBOARD_RPC_STATE.idFromName(row.tenant_id)
                const dashboardStub = c.env.DASHBOARD_RPC_STATE.get(dashboardId)
                await dashboardStub.push('CHARGE_COMPLETED', record)
            } catch (err) {
                console.warn('[webhook] DASHBOARD_RPC_STATE push failed (admin offline?):', err)
            }
        }
    }

    if (event.type === 'CHARGE_FAILED' && event.providerChargeId) {
        const now = Math.floor(Date.now() / 1000)
        await c.env.DB.prepare(
            `UPDATE tenant_charges SET status = 'FAILED', updated_at = ?
             WHERE provider_charge_id = ?`
        ).bind(now, event.providerChargeId).run()
    }

    return c.json({ ok: true }, 200)
})

export { paymentsRoute }
