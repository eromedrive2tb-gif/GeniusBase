import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'
import { getProvider } from '../../payments/registry'

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
            return c.json({ error: 'Too Many Requests: Rate limit exceeded for anonymous checkout (max 5/hour)' }, 429)
        }
        await c.env.KV_CACHE.put(kvKey, (count + 1).toString(), { expirationTtl: 3600 })
    }

    // Require service or anon role to create transactions directly
    if (userRole !== 'service' && userRole !== 'anon') {
        return c.json({ error: 'Forbidden: only service or anon tokens can generate transactions' }, 403)
    }

    let payload: any
    try {
        payload = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON request body' }, 400)
    }

    const amount = Number(payload.amount)
    const providerName = typeof payload.provider === 'string' ? payload.provider : 'openpix'
    const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null

    const customerId = typeof payload.customer_id === 'string' ? payload.customer_id : null

    if (customerId) {
        const customerExists = await c.env.DB.prepare(
            `SELECT id FROM customers WHERE id = ? AND tenant_id = ?`
        ).bind(customerId, tenantId).first()

        if (!customerExists) {
            return c.json({ error: 'customer_id is invalid or does not belong to this tenant' }, 400)
        }
    }

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
        return c.json({ error: 'Valid integer amount (in cents) is required' }, 400)
    }

    // 1. Fetch Tenant's Gateway Credential
    const gatewayConfig = await c.env.DB.prepare(
        `SELECT credentials FROM tenant_gateways WHERE tenant_id = ? AND provider = ? AND is_active = 1 LIMIT 1`
    ).bind(tenantId, providerName).first<{ credentials: string }>()

    if (!gatewayConfig) {
        return c.json({ error: `Provider '${providerName}' not configured for this tenant.` }, 400)
    }

    let creds: Record<string, unknown> = {}
    try { creds = JSON.parse(gatewayConfig.credentials) as Record<string, unknown> } catch { }

    const rawAppId = typeof creds.appId === 'string' ? creds.appId.trim() : ''
    if (!rawAppId) {
        return c.json({ error: `Invalid credentials for provider '${providerName}'.` }, 400)
    }

    const providerKey = creds.sandbox === true ? `sandbox|${rawAppId}` : rawAppId
    const gateway = getProvider(providerName)
    const transactionId = `txn_${crypto.randomUUID().replace(/-/g, '')}`

    // 2. Call Gateway API directly (no order)
    let providerRes
    try {
        providerRes = await gateway.createCharge({
            correlationID: transactionId,
            amount,
            comment: `Standalone TX - Tenant ${tenantId.slice(0, 8)}`,
        }, providerKey)
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        return c.json({ error: `Gateway error: ${errorMsg}` }, 502)
    }

    // 3. Insert into D1 with order_id = NULL
    try {
        await c.env.DB.prepare(
            `INSERT INTO tenant_transactions 
                (id, tenant_id, order_id, provider, provider_transaction_id, amount, payment_method, status, metadata, customer_id)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            transactionId,
            tenantId,
            providerName,
            providerRes.providerChargeId,
            amount,
            'PIX', // For now, defaulting to PIX
            'PENDING',
            metadata,
            customerId
        ).run()
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        return c.json({ error: `Database error: ${errorMsg}` }, 500)
    }

    // 4. Return
    return c.json({
        success: true,
        data: {
            transaction_id: transactionId,
            provider_transaction_id: providerRes.providerChargeId,
            amount: amount,
            brCode: providerRes.brCode,
            paymentLinkUrl: providerRes.paymentLinkUrl,
            status: 'PENDING',
        }
    }, 201)
})

export { transactionsRoute }
