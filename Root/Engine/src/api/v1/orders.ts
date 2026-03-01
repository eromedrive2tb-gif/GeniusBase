/**
 * Public BaaS Orders Route — E-commerce Checkout
 * Root/Engine/src/api/v1/orders.ts
 *
 * Responsabilidade: criar um pedido completo (order + line items + transaction)
 * e emitir a cobrança na gateway de pagamento configurada pelo Tenant.
 *
 * ─── Segurança ────────────────────────────────────────────────────────────────
 * Os preços são SEMPRE buscados no backend (tenant_products) — nunca aceitos
 * do payload do cliente. Isso impede manipulação de preço no frontend.
 *
 * ─── ACID ─────────────────────────────────────────────────────────────────────
 * Usa db.batch() do D1 para garantir que order + order_items + transaction
 * são inseridos atomicamente. Se qualquer statement falhar, nenhum é persistido.
 *
 * Endpoints:
 *   POST /api/v1/orders   → apiKeyAuth (service) → full checkout flow
 */

import { Hono } from 'hono'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { getProvider } from '../../payments/registry'

const ordersRoute = new Hono<{ Bindings: Env }>()

// ─── POST / — Checkout ───────────────────────────────────────

ordersRoute.post('/', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId' as never) as string

    // ── 1. Parse and validate body ─────────────────────────
    type OrderItem = { product_id: string; quantity: number }
    let body: { items?: unknown; provider?: unknown; customer_id?: unknown }
    try { body = await c.req.json() } catch {
        return c.json({ error: 'Body must be valid JSON' }, 400)
    }

    const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
    if (!provider) return c.json({ error: '"provider" (string) is required' }, 400)

    if (!Array.isArray(body.items) || body.items.length === 0) {
        return c.json({ error: '"items" must be a non-empty array' }, 400)
    }

    // Validate each item shape
    const rawItems = body.items as unknown[]
    const items: OrderItem[] = []
    for (const item of rawItems) {
        if (
            typeof item !== 'object' || item === null ||
            typeof (item as Record<string, unknown>).product_id !== 'string' ||
            typeof (item as Record<string, unknown>).quantity !== 'number' ||
            !Number.isInteger((item as Record<string, unknown>).quantity as number) ||
            ((item as Record<string, unknown>).quantity as number) <= 0
        ) {
            return c.json({
                error: 'Each item must have { product_id: string, quantity: integer > 0 }',
            }, 400)
        }
        items.push({
            product_id: (item as Record<string, unknown>).product_id as string,
            quantity: (item as Record<string, unknown>).quantity as number,
        })
    }

    const customerId = typeof body.customer_id === 'string' ? body.customer_id : null

    // ── 2. Resolve gateway provider ────────────────────────
    let gateway
    try { gateway = getProvider(provider) }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Unknown provider' }, 400)
    }

    // ── 3. Fetch prices server-side (NEVER trust client prices) ──
    // Fetch in a single batch query using IN(?) with individual lookups per item
    // to get per-item prices (D1 doesn't support parameterized IN arrays natively).
    const priceMap = new Map<string, number>()
    for (const item of items) {
        const row = await c.env.DB.prepare(
            `SELECT id, price FROM products
             WHERE id = ? AND tenant_id = ?`
        ).bind(item.product_id, tenantId)
            .first<{ id: string; price: number }>()

        if (!row) {
            return c.json({ error: `Product "${item.product_id}" not found or does not belong to this tenant` }, 422)
        }
        priceMap.set(item.product_id, row.price)
    }

    // ── 4. Calculate total (server-side authority) ─────────
    let totalAmount = 0
    for (const item of items) {
        totalAmount += (priceMap.get(item.product_id) ?? 0) * item.quantity
    }
    if (totalAmount <= 0) {
        return c.json({ error: 'total_amount calculated to zero — check product prices' }, 422)
    }

    // ── 5. Fetch tenant gateway credentials from D1 ────────
    const gatewayRow = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways
         WHERE tenant_id = ? AND provider = ? AND is_active = 1`
    ).bind(tenantId, provider).first<{ credentials: string }>()

    if (!gatewayRow) {
        return c.json({
            error: `Gateway "${provider}" not configured for this tenant. ` +
                `Add your credentials in Dashboard → Gateways.`,
        }, 422)
    }

    let creds: Record<string, unknown>
    try { creds = JSON.parse(gatewayRow.credentials) as Record<string, unknown> }
    catch { return c.json({ error: 'Malformed gateway credentials in database' }, 500) }

    const rawAppId = typeof creds.appId === 'string' ? creds.appId.trim() : ''
    if (!rawAppId) return c.json({ error: 'Gateway credential "appId" is missing' }, 422)
    const appId = creds.sandbox === true ? `sandbox|${rawAppId}` : rawAppId

    // ── 6. Prepare IDs ─────────────────────────────────────
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`
    const txnId = `txn_${crypto.randomUUID().replace(/-/g, '')}`
    // correlationID = orderId: single source of truth that maps gateway event → order
    const correlationID = orderId
    const now = new Date().toISOString()

    // ── 7. Call the gateway BEFORE writing to DB ───────────
    // If gateway fails we won't leave orphan records in D1.
    let chargeResult
    try {
        chargeResult = await gateway.createCharge(
            { correlationID, amount: totalAmount, comment: 'Pedido via GeniusBase' },
            appId,
        )
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gateway error'
        console.error(`[orders] ${provider} createCharge failed:`, msg)
        return c.json({ error: msg }, 502)
    }

    // ── 8. Atomic batch write (D1 batch = ACID) ────────────
    const metadataJson = JSON.stringify({ items })

    // Build order_items statements
    const itemStatements = items.map((item) => {
        const itemId = `oi_${crypto.randomUUID().replace(/-/g, '')}`
        return c.env.DB.prepare(
            `INSERT INTO tenant_order_items
             (id, order_id, product_id, quantity, price_at_time)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(
            itemId, orderId,
            item.product_id,
            item.quantity,
            priceMap.get(item.product_id) ?? 0,
        )
    })

    try {
        await c.env.DB.batch([
            // Insert the order
            c.env.DB.prepare(
                `INSERT INTO tenant_orders
                 (id, tenant_id, customer_id, status, total_amount, created_at, updated_at)
                 VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`
            ).bind(orderId, tenantId, customerId, totalAmount, now, now),

            // Insert all line items
            ...itemStatements,

            // Insert the transaction record
            c.env.DB.prepare(
                `INSERT INTO tenant_transactions
                 (id, tenant_id, order_id, provider, provider_transaction_id,
                  amount, payment_method, status, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'PIX', 'PENDING', ?, ?)`
            ).bind(
                txnId, tenantId, orderId, provider,
                chargeResult.providerChargeId,
                totalAmount, metadataJson, now,
            ),
        ])
    } catch (err) {
        console.error('[orders] D1 batch failed:', err)
        return c.json({ error: 'Failed to persist order — database error' }, 500)
    }

    // ── 9. Return checkout data ────────────────────────────
    return c.json({
        success: true,
        data: {
            order_id: orderId,
            transaction_id: txnId,
            provider,
            provider_transaction_id: chargeResult.providerChargeId,
            total_amount: totalAmount,
            status: 'PENDING',
            brCode: chargeResult.brCode,
            items: items.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                price_at_time: priceMap.get(i.product_id),
            })),
            created_at: now,
        },
    }, 201)
})

// ── GET /:id — Get order status (for polling fallback) ──────────

ordersRoute.get('/:id', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId' as never) as string
    const orderId = c.req.param('id')

    const order = await c.env.DB.prepare(
        `SELECT
             o.id, o.tenant_id, o.status, o.total_amount, o.created_at, o.updated_at,
             COALESCE(t.payment_method, 'PIX')  AS payment_method,
             COALESCE(t.status, 'PENDING')       AS transaction_status
         FROM tenant_orders o
         LEFT JOIN tenant_transactions t ON t.order_id = o.id
         WHERE o.id = ? AND o.tenant_id = ?`
    ).bind(orderId, tenantId)
        .first<{
            id: string; tenant_id: string; status: string; total_amount: number;
            created_at: string; updated_at: string;
            payment_method: string; transaction_status: string
        }>()

    if (!order) {
        return c.json({ error: `Order "${orderId}" not found` }, 404)
    }

    const { results: items } = await c.env.DB.prepare(
        `SELECT product_id, quantity, price_at_time FROM tenant_order_items WHERE order_id = ?`
    ).bind(orderId).all()

    return c.json({ success: true, data: { ...order, items } })
})

export { ordersRoute }
