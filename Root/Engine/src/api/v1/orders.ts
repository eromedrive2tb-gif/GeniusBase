/**
 * Public BaaS Orders Route — E-commerce Checkout
 * Root/Engine/src/api/v1/orders.ts
 */

import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { createAuthRouter } from '../../utils/router'
import { GatewayRegistry } from '../../domain/gateways/GatewayRegistry'
import { OrderRepository } from '../../domain/repositories/OrderRepository'
import { CustomerRepository } from '../../domain/repositories/CustomerRepository'
import { OrderCreateSchema } from '../../domain/schemas'
import { WebhookDispatcher } from '../../domain/events/WebhookDispatcher'
import { BadRequestError, DomainError, NotFoundError, RateLimitError, UnprocessableEntityError } from '../../domain/errors'

const ordersRoute = createAuthRouter()

// ─── POST / — Checkout ───────────────────────────────────────

ordersRoute.post('/', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId') as string
    const userRole = c.get('userRole')

    // ── 0. Rate Limiting for Anonymous Guest Checkouts ─────────
    if (userRole === 'anon') {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown'
        const kvKey = `ratelimit:checkout:${ip}`
        const countStr = await c.env.KV_CACHE.get(kvKey)
        const count = parseInt(countStr || '0', 10)

        if (count >= 5) {
            throw new RateLimitError('Rate limit exceeded for anonymous checkout (max 5/hour)')
        }
        await c.env.KV_CACHE.put(kvKey, (count + 1).toString(), { expirationTtl: 3600 })
    }

    // ── 0.5 Idempotency Key ────────────────────────────────
    const idempotencyKey = c.req.header('Idempotency-Key')
    if (idempotencyKey) {
        const kvKey = `idemp:order:${tenantId}:${idempotencyKey}`
        const existing = await c.env.KV_CACHE.get(kvKey)
        if (existing) return c.json(JSON.parse(existing), 200)
    }

    // ── 1. Parse and validate body ─────────────────────────
    const rawBody = await c.req.json()
    const body = OrderCreateSchema.parse(rawBody)

    const providerName = body.provider.trim()
    const customerId = body.customer_id || null

    if (customerId) {
        const customerExists = await CustomerRepository.findById(c.env.DB, customerId, tenantId)
        if (!customerExists) {
            throw new BadRequestError('customer_id is invalid or does not belong to this tenant')
        }
    }

    // ── 2. Resolve gateway and credentials ────────────────────────
    let gateway
    try { gateway = GatewayRegistry.get(providerName) }
    catch (err) {
        throw new BadRequestError(err instanceof Error ? err.message : 'Unknown provider')
    }

    const gatewayRow = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways WHERE tenant_id = ? AND provider = ? AND is_active = 1`
    ).bind(tenantId, providerName).first<{ credentials: string }>()

    if (!gatewayRow) {
        throw new UnprocessableEntityError(`Gateway "${providerName}" not configured for this tenant.`)
    }

    // ── 3. Fetch prices and validate stock server-side ──
    const { priceMap, stockMap } = await OrderRepository.validateStockAndGetPrices(c.env.DB, tenantId, body.items)

    // ── 4. Calculate total amount ─────────
    let totalAmount = 0
    for (const item of body.items) {
        totalAmount += (priceMap.get(item.product_id) ?? 0) * item.quantity
    }

    // ── 5. Prepare IDs ─────────────────────────────────────
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`
    const txnId = `txn_${crypto.randomUUID().replace(/-/g, '')}`

    // ── 6. Call the gateway BEFORE writing to DB ───────────
    let chargeResult
    try {
        chargeResult = await gateway.createCharge(
            { correlationID: orderId, amount: totalAmount, comment: 'Pedido via GeniusBase' },
            gatewayRow.credentials,
        )
    } catch (err: any) {
        throw new DomainError(err.message, 'GATEWAY_ERROR', 502)
    }

    // ── 7. Finalize in Database via Repository ────────────
    await OrderRepository.createOrderBatch(c.env.DB, {
        orderId, txnId, tenantId, customerId, totalAmount,
        metadata: body.metadata,
        items: body.items,
        priceMap,
        provider: providerName,
        providerChargeId: chargeResult.providerChargeId
    })

    // ── 8. Return checkout data ────────────────────────────
    const responsePayload = {
        success: true,
        data: {
            order_id: orderId,
            transaction_id: txnId,
            provider: providerName,
            provider_transaction_id: chargeResult.providerChargeId,
            total_amount: totalAmount,
            status: 'PENDING',
            brCode: chargeResult.brCode,
            paymentLinkUrl: chargeResult.paymentLinkUrl,
            items: body.items.map((i: any) => ({
                product_id: i.product_id,
                quantity: i.quantity,
                price_at_time: priceMap.get(i.product_id),
            })),
            created_at: new Date().toISOString(),
        },
    }

    // ── 9. Módulo EDA Webhooks OMNI ─────────────────────────
    c.executionCtx.waitUntil(WebhookDispatcher.dispatch(c.env, tenantId, 'ORDER_CREATED', responsePayload.data))

    // Detectar e despachar Esgotamento de Estoque (Out of stock) de forma passiva nas sombras:
    for (const item of body.items) {
        const stockBefore = stockMap.get(item.product_id) || 0
        if (stockBefore - item.quantity === 0) {
            c.executionCtx.waitUntil(WebhookDispatcher.dispatch(c.env, tenantId, 'PRODUCT_OUT_OF_STOCK', {
                product_id: item.product_id,
                order_trigger_id: orderId,
                status: 'OUT_OF_STOCK',
                timestamp: new Date().toISOString()
            }))
        }
    }

    if (idempotencyKey) {
        const kvKey = `idemp:order:${tenantId}:${idempotencyKey}`
        await c.env.KV_CACHE.put(kvKey, JSON.stringify(responsePayload), { expirationTtl: 86400 }) // 24 hours
    }

    return c.json(responsePayload, 201)
})

// ── GET /:id — Get order status (for polling fallback) ──────────

ordersRoute.get('/:id', apiKeyAuth, async (c) => {
    const tenantId = c.get('tenantId') as string
    const orderId = c.req.param('id')

    const order = await OrderRepository.findById(c.env.DB, tenantId, orderId || '')
    if (!order) throw new NotFoundError(`Order "${orderId}" not found`)

    let parsedMetadata = {}
    if (order.metadata) {
        try { parsedMetadata = JSON.parse(order.metadata) } catch { }
    }

    return c.json({ success: true, data: { ...order, metadata: parsedMetadata } })
})

export { ordersRoute }
