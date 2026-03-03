/**
 * Public BaaS Transactions Route
 * Root/Engine/src/api/v1/transactions.ts
 */

import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { createAuthRouter } from '../../utils/router'
import { GatewayRegistry } from '../../domain/gateways/GatewayRegistry'
import { TransactionRepository } from '../../domain/repositories/TransactionRepository'
import { CustomerRepository } from '../../domain/repositories/CustomerRepository'
import { TransactionCreateSchema } from '../../domain/schemas'
import { WebhookDispatcher } from '../../domain/events/WebhookDispatcher'
import { BadRequestError, DomainError, RateLimitError, UnprocessableEntityError } from '../../domain/errors'

const transactionsRoute = createAuthRouter()

// ── POST / — Create independent transaction ───────────────────────

transactionsRoute.post('/', apiKeyAuth, async (c) => {
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
        const kvKey = `idemp:txn:${tenantId}:${idempotencyKey}`
        const existing = await c.env.KV_CACHE.get(kvKey)
        if (existing) return c.json(JSON.parse(existing), 200)
    }

    const rawBody = await c.req.json()
    const payload = TransactionCreateSchema.parse({
        ...rawBody,
        amount: Number(rawBody.amount) // Type coerce for safety
    })

    const amount = payload.amount
    const providerName = payload.provider.trim()
    const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null
    const customerId = payload.customer_id || null

    if (customerId) {
        const customerExists = await CustomerRepository.findById(c.env.DB, customerId, tenantId)
        if (!customerExists) {
            throw new Error('customer_id is invalid or does not belong to this tenant') // It will be caught by boundary or we can throw DomainError
        }
    }

    // 1. Fetch Tenant's Gateway Credential
    const gatewayConfig = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways WHERE tenant_id = ? AND provider = ? AND is_active = 1 LIMIT 1`
    ).bind(tenantId, providerName).first<{ credentials: string }>()

    if (!gatewayConfig) {
        throw new UnprocessableEntityError(`Provider '${providerName}' not configured for this tenant.`)
    }

    let gateway
    try { gateway = GatewayRegistry.get(providerName) } catch (err: any) {
        throw new BadRequestError(err.message)
    }

    const transactionId = `txn_${crypto.randomUUID().replace(/-/g, '')}`

    // 2. Call Gateway API
    let providerRes
    try {
        providerRes = await gateway.createCharge({
            correlationID: transactionId,
            amount,
            comment: `Standalone TX - Tenant ${tenantId.slice(0, 8)}`,
        }, gatewayConfig.credentials)
    } catch (err: any) {
        throw new DomainError(err.message, 'GATEWAY_ERROR', 502)
    }

    // 3. Insert via Repository
    await TransactionRepository.createStandalone(c.env.DB, {
        id: transactionId,
        tenantId,
        provider: providerName,
        providerTxnId: providerRes.providerChargeId,
        amount,
        metadata,
        customerId
    })

    const responsePayload = {
        success: true,
        data: {
            transaction_id: transactionId,
            provider_transaction_id: providerRes.providerChargeId,
            amount,
            brCode: providerRes.brCode,
            paymentLinkUrl: providerRes.paymentLinkUrl,
            status: 'PENDING',
            created_at: new Date().toISOString()
        }
    }

    c.executionCtx.waitUntil(WebhookDispatcher.dispatch(c.env, tenantId, 'TRANSACTION_CREATED', responsePayload.data))

    if (idempotencyKey) {
        const kvKey = `idemp:txn:${tenantId}:${idempotencyKey}`
        await c.env.KV_CACHE.put(kvKey, JSON.stringify(responsePayload), { expirationTtl: 86400 }) // 24 hours
    }

    return c.json(responsePayload, 201)
})

export { transactionsRoute }
