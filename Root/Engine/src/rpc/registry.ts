/**
 * RPC Command Registry
 * Root/Engine/src/rpc/registry.ts
 *
 * Padrão Open/Closed: Para adicionar novos comandos, apenas adicione uma
 * entrada ao `commandRegistry`. Nunca modifique o DashboardRPCState.
 *
 * Contrato de Handler:
 *   - Recebe: RpcContext { payload, tenantId, env, broadcast }
 *   - Retorna: Promise<unknown> → response.data no envelope RPC
 *   - Lança: Error → capturado pelo DO e enviado como response.error
 *   - Chama: ctx.broadcast(event, payload) → Domain Event para sessões peer
 */

import { WebhookDispatcher } from '../domain/events/WebhookDispatcher'

export interface RpcContext {
    payload: Record<string, unknown>
    tenantId: string
    env: Env
    /**
     * Broadcast a domain event to all peer WebSocket sessions of this Tenant,
     * EXCLUDING the originating socket (that session resolves its own Promise).
     * Optional: handlers that don't produce domain events can simply ignore it.
     */
    broadcast: (event: string, payload: unknown) => void
}

export type RpcHandler = (ctx: RpcContext) => Promise<unknown>

// ─── Users (End-Users / tenant_users table) ────────────────

const fetchUsers: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT id, email, created_at FROM tenant_users WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all()
    return results
}

const createUser: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const email = (typeof payload['email'] === 'string' ? payload['email'] : '').trim().toLowerCase()
    const password = (typeof payload['password'] === 'string' ? payload['password'] : '').trim()

    if (!email || !password) throw new Error('E-mail e senha são obrigatórios.')
    if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.')

    // Check for duplicate email within this tenant
    const existing = await env.DB.prepare(
        'SELECT id FROM tenant_users WHERE tenant_id = ? AND email = ?'
    ).bind(tenantId, email).first()
    if (existing) throw new Error('Este e-mail já está cadastrado neste Tenant.')

    // Hash password using PBKDF2 (same algorithm as the auth utils)
    const enc = new TextEncoder()
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
        keyMat, 256
    )
    const hashHex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
    const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('')
    const passwordHash = `${saltHex}:${hashHex}`

    const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`
    const now = new Date().toISOString()

    await env.DB.prepare(
        'INSERT INTO tenant_users (id, tenant_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tenantId, email, passwordHash, now).run()

    const record = { id, tenant_id: tenantId, email, created_at: now }
    broadcast('USER_CREATED', record)

    try { WebhookDispatcher.dispatch(env, tenantId, 'END_USER_CREATED_BY_ADMIN', record) } catch { }

    return record
}

const deleteUser: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const id = (typeof payload['id'] === 'string' ? payload['id'] : '').trim()
    if (!id) throw new Error('ID do usuário é obrigatório.')

    // Verify the user belongs to this tenant before deleting (tenant isolation)
    const existing = await env.DB.prepare(
        'SELECT id FROM tenant_users WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first()
    if (!existing) throw new Error('Usuário não encontrado neste Tenant.')

    await env.DB.prepare(
        'DELETE FROM tenant_users WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).run()

    broadcast('USER_DELETED', { id })

    try { WebhookDispatcher.dispatch(env, tenantId, 'END_USER_DELETED_BY_ADMIN', { id }) } catch { }

    return { deleted: true, id }
}

// ─── Customers ─────────────────────────────────────────────

const fetchCustomers: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all<{ id: string; name: string; email: string | null; created_at: number; metadata: string | null }>()
    return results.map(row => ({
        ...row,
        metadata: (() => { try { return JSON.parse(row.metadata ?? '{}') } catch { return {} } })()
    }))
}

const createCustomer: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const name = (typeof payload['name'] === 'string' ? payload['name'] : '').trim()
    const email = (typeof payload['email'] === 'string' ? payload['email'] : '').trim()

    if (!name) throw new Error('O nome do cliente é obrigatório.')

    const id = `cus_${crypto.randomUUID().replace(/-/g, '')}`
    const now = new Date().toISOString()

    await env.DB.prepare(
        'INSERT INTO customers (id, tenant_id, name, email, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tenantId, name, email || null, now).run()

    const record = { id, tenant_id: tenantId, name, email: email || null, created_at: now }
    broadcast('CUSTOMER_CREATED', record)

    try { WebhookDispatcher.dispatch(env, tenantId, 'CUSTOMER_CREATED', record) } catch { }

    return record
}

// ─── Products ──────────────────────────────────────────────

const fetchProducts: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all<{ id: string; name: string; price: number; stock: number; created_at: number; metadata: string | null }>()
    return results.map(row => ({
        ...row,
        metadata: (() => { try { return JSON.parse(row.metadata ?? '{}') } catch { return {} } })()
    }))
}

const createProduct: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const name = (typeof payload['name'] === 'string' ? payload['name'] : '').trim()
    const price = Number(payload['price'])
    const stock = Number(payload['stock']) || 0

    if (!name || isNaN(price) || price < 0) {
        throw new Error('Nome e Preço (número válido, em centavos) são obrigatórios.')
    }

    const id = `prod_${crypto.randomUUID().replace(/-/g, '')}`
    const now = new Date().toISOString()

    await env.DB.prepare(
        'INSERT INTO products (id, tenant_id, name, price, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, tenantId, name, price, stock, now).run()

    const record = { id, tenant_id: tenantId, name, price, stock, created_at: now }
    broadcast('PRODUCT_CREATED', record)

    try { WebhookDispatcher.dispatch(env, tenantId, 'PRODUCT_CREATED', record) } catch { }

    return record
}

// ─── Events (Igor Telemetry) ──────────────────────────────

const fetchEvents: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT id, name, payload, created_at FROM tenant_events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all<{ id: string; name: string; payload: string | null; created_at: number }>()
    // Deserialize payload TEXT → object for each row
    return results.map(row => ({
        ...row,
        payload: (() => { try { return JSON.parse(row.payload ?? 'null') } catch { return null } })()
    }))
}

// ─── Dashboard Stats & Analytics ────────────────────────────────

const fetchAnalytics: RpcHandler = async ({ tenantId, env }) => {
    // We execute 4 separate COUNT/SUM queries in parallel via Promise.all
    // - Revenue E-commerce (Orders PAID)
    // - Revenue Transactions (Standalone COMPLETED)
    // - Total Customers
    // - Total Paid Orders
    const [revOrders, revTrans, custCount, orderCount] = await Promise.all([
        env.DB.prepare("SELECT SUM(total_amount) as total FROM tenant_orders WHERE tenant_id = ? AND status = 'PAID'")
            .bind(tenantId).first<{ total: number | null }>(),
        env.DB.prepare("SELECT SUM(amount) as total FROM tenant_transactions WHERE tenant_id = ? AND status = 'COMPLETED'")
            .bind(tenantId).first<{ total: number | null }>(),
        env.DB.prepare("SELECT COUNT(id) as count FROM customers WHERE tenant_id = ?")
            .bind(tenantId).first<{ count: number }>(),
        env.DB.prepare("SELECT COUNT(id) as count FROM tenant_orders WHERE tenant_id = ? AND status = 'PAID'")
            .bind(tenantId).first<{ count: number }>(),
    ])

    return {
        revenueOrders: revOrders?.total ?? 0,
        revenueTransactions: revTrans?.total ?? 0,
        totalCustomers: custCount?.count ?? 0,
        totalOrders: orderCount?.count ?? 0,
    }
}

const fetchDashboardStats: RpcHandler = async ({ tenantId, env }) => {
    const [usersRes, customersRes, productsRes] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?')
            .bind(tenantId).first<{ count: number }>(),
        env.DB.prepare('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?')
            .bind(tenantId).first<{ count: number }>(),
        env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ?')
            .bind(tenantId).first<{ count: number }>(),
    ])
    return {
        users: usersRes?.count ?? 0,
        customers: customersRes?.count ?? 0,
        products: productsRes?.count ?? 0,
        fetched_at: new Date().toISOString(),
    }
}

// ─── Gateways (per-tenant payment credentials) ────────────────

const fetchGateways: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        `SELECT id, provider, is_active, updated_at
         FROM tenant_gateways WHERE tenant_id = ? ORDER BY provider`
    ).bind(tenantId).all<{
        id: string; provider: string; is_active: number; updated_at: number
    }>()
    // Never expose raw credentials — return only presence/status
    return (results ?? []).map(row => ({
        id: row.id,
        provider: row.provider,
        is_active: !!row.is_active,
        updated_at: row.updated_at,
        configured: true,
    }))
}

const saveGateway: RpcHandler = async ({ payload, tenantId, env }) => {
    const provider = (typeof payload['provider'] === 'string' ? payload['provider'] : '').trim()
    const credentials = (typeof payload['credentials'] === 'object' ? payload['credentials'] : null)

    if (!provider) throw new Error('"provider" é obrigatório.')
    if (!credentials) throw new Error('"credentials" (objeto) é obrigatório.')

    const supportedProviders = ['openpix', 'stripe']
    if (!supportedProviders.includes(provider)) {
        throw new Error(`Provider "${provider}" não suportado. Use: ${supportedProviders.join(', ')}`)
    }

    const id = `gw_${crypto.randomUUID().replace(/-/g, '')}`
    const credentialsStr = JSON.stringify(credentials)
    const now = new Date().toISOString()

    await env.DB.prepare(
        `INSERT INTO tenant_gateways (id, tenant_id, provider, credentials, is_active, updated_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(tenant_id, provider) DO UPDATE SET
             credentials = excluded.credentials,
             is_active   = 1,
             updated_at  = excluded.updated_at`
    ).bind(id, tenantId, provider, credentialsStr, now).run()

    const record = { provider, is_active: true, updated_at: now }

    try { WebhookDispatcher.dispatch(env, tenantId, 'GATEWAY_CONFIGURED', record) } catch { }

    return record
}

// ── Orders (E-commerce) ───────────────────────────────────────

const fetchOrders: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        `SELECT
             o.id,
             o.tenant_id,
             o.customer_id,
             c.name AS customer_name,
             c.email AS customer_email,
             o.status,
             o.total_amount,
             o.metadata,
             o.created_at,
             o.updated_at,
             COALESCE(t.payment_method, 'PIX')  AS payment_method,
             COALESCE(t.provider, 'openpix')    AS provider,
             COALESCE(t.status, 'PENDING')       AS transaction_status,
             (
                 SELECT COUNT(*) FROM tenant_order_items oi
                 WHERE oi.order_id = o.id
             ) AS item_count
         FROM tenant_orders o
         LEFT JOIN tenant_transactions t ON t.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.tenant_id = ?
         ORDER BY o.created_at DESC
         LIMIT 50`
    ).bind(tenantId).all<any>()

    return results.map(row => ({
        ...row,
        metadata: (() => { try { return JSON.parse(row.metadata ?? '{}') } catch { return {} } })()
    }))
}

// ── Transactions (Standalone) ─────────────────────────────────

const fetchTransactions: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        `SELECT 
             t.id, t.provider, t.amount, t.status, t.payer_name, t.payer_document, t.created_at,
             t.customer_id, c.name AS customer_name, c.email AS customer_email
         FROM tenant_transactions t
         LEFT JOIN customers c ON t.customer_id = c.id
         WHERE t.tenant_id = ? AND t.order_id IS NULL
         ORDER BY t.created_at DESC LIMIT 50`
    ).bind(tenantId).all()
    return results ?? []
}

// ── Storage (Cloudflare R2) ───────────────────────────────────

const fetchFiles: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        `SELECT id, filename, mime_type, size_bytes, public_url, created_at
         FROM tenant_files
         WHERE tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`
    ).bind(tenantId).all()
    return results ?? []
}

const deleteFile: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const id = (typeof payload['id'] === 'string' ? payload['id'] : '').trim()
    if (!id) throw new Error('ID do arquivo é obrigatório.')

    // 1. Validate ownership and get R2 bucket_path
    const fileRow = await env.DB.prepare(
        `SELECT bucket_path FROM tenant_files WHERE id = ? AND tenant_id = ?`
    ).bind(id, tenantId).first<{ bucket_path: string }>()

    if (!fileRow) {
        throw new Error('Arquivo não encontrado neste tenant.')
    }

    // 2. Delete physical object from R2 Storage
    try {
        await env.R2_STORAGE.delete(fileRow.bucket_path)
    } catch (err: any) {
        throw new Error(`Erro ao deletar arquivo no R2: ${err.message}`)
    }

    // 3. Delete metadata from D1
    await env.DB.prepare(
        `DELETE FROM tenant_files WHERE id = ? AND tenant_id = ?`
    ).bind(id, tenantId).run()

    broadcast('FILE_DELETED', { id })

    try { WebhookDispatcher.dispatch(env, tenantId, 'FILE_DELETED', { id }) } catch { }

    return { deleted: true, id }
}

// ── Webhooks (Advanced EDA Phase 29.5) ─────────────────────────

const fetchWebhooks: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT id, url, events, created_at FROM tenant_webhooks WHERE tenant_id = ? ORDER BY created_at DESC'
    ).bind(tenantId).all()
    return results ?? []
}

const addWebhook: RpcHandler = async ({ payload, tenantId, env }) => {
    const url = (typeof payload['url'] === 'string' ? payload['url'] : '').trim()
    const events = Array.isArray(payload['events']) ? payload['events'] : ['*']

    if (!url || !url.startsWith('https://')) throw new Error('A URL do webhook é obrigatória e deve ser segura (HTTPS).')
    if (events.length === 0) throw new Error('Selecione pelo menos um evento.')

    const id = `wh_${crypto.randomUUID().replace(/-/g, '')}`
    const eventsJson = JSON.stringify(events)

    await env.DB.prepare(`
        INSERT INTO tenant_webhooks (id, tenant_id, url, events) 
        VALUES (?, ?, ?, ?)
    `).bind(id, tenantId, url, eventsJson).run()

    return { success: true, id, url, events: eventsJson }
}

const deleteWebhook: RpcHandler = async ({ payload, tenantId, env }) => {
    const id = (typeof payload['id'] === 'string' ? payload['id'] : '').trim()
    if (!id) throw new Error('ID do webhook é obrigatório.')

    await env.DB.prepare(`DELETE FROM tenant_webhooks WHERE id = ? AND tenant_id = ?`)
        .bind(id, tenantId).run()

    return { deleted: true, id }
}

const testWebhook: RpcHandler = async ({ payload, tenantId }) => {
    const url = (typeof payload['url'] === 'string' ? payload['url'] : '').trim()
    if (!url) throw new Error('URL inválida para teste.')

    try {
        const testRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-GeniusBase-Event': 'TEST_EVENT',
                'User-Agent': 'GeniusBase-Webhook/1.0'
            },
            body: JSON.stringify({
                event: 'TEST_EVENT',
                tenant_id: tenantId,
                timestamp: new Date().toISOString(),
                payload: { message: 'GeniusBase Webhook Test' }
            })
        })
        return { success: testRes.ok, status: testRes.status }
    } catch (err: any) {
        throw new Error(`Falha ao disparar Webhook: ${err.message}`)
    }
}

const testAllWebhookEvents: RpcHandler = async ({ payload, tenantId, env }) => {
    const url = (typeof payload['url'] === 'string' ? payload['url'] : '').trim()
    if (!url) throw new Error('URL inválida para teste.')

    // 1. Fetch real data samples to make tests ultra-realistic
    const [dbProd, dbCus, dbUsr, dbTxn, dbOrd, dbFile] = await Promise.all([
        env.DB.prepare(`SELECT * FROM products WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1`).bind(tenantId).first<any>(),
        env.DB.prepare(`SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1`).bind(tenantId).first<any>(),
        env.DB.prepare(`SELECT * FROM tenant_users WHERE tenant_id = ? LIMIT 1`).bind(tenantId).first<any>(),
        env.DB.prepare(`SELECT * FROM tenant_transactions WHERE tenant_id = ? AND order_id IS NULL LIMIT 1`).bind(tenantId).first<any>(),
        env.DB.prepare(`SELECT * FROM tenant_orders WHERE tenant_id = ? LIMIT 1`).bind(tenantId).first<any>(),
        env.DB.prepare(`SELECT * FROM tenant_files WHERE tenant_id = ? LIMIT 1`).bind(tenantId).first<any>(),
    ])

    // 2. Build Hybrid Payloads (Real if exists, Mock if absent)
    const prodPayload = dbProd || { id: 'prod_mock123', name: 'Produto Sandbox', price: 9900, stock: 10 }
    const cusPayload = dbCus || { id: 'cus_mock123', name: 'João Sandbox', email: 'joao@sandbox.com' }
    const usrPayload = dbUsr || { id: 'usr_mock123', email: 'user@sandbox.com' }
    const filePayload = dbFile || { id: 'file_mock123', filename: 'sandbox.pdf', size_bytes: 102400 }

    const txnPayload = dbTxn ? {
        transaction_id: dbTxn.id, amount: dbTxn.amount, status: dbTxn.status, created_at: dbTxn.created_at
    } : { transaction_id: 'txn_mock123', amount: 5000, status: 'PENDING' }

    const ordPayload = dbOrd ? {
        order_id: dbOrd.id, total_amount: dbOrd.total_amount, status: dbOrd.status, created_at: dbOrd.created_at
    } : { order_id: 'ord_mock123', total_amount: 15000, status: 'PENDING' }

    const eventsToTest = [
        { name: 'CUSTOM_EVENT_RECEIVED', payload: { source: 'dashboard_test', message: 'Hello EDA!' } },
        { name: 'ORDER_CREATED', payload: { ...ordPayload, status: 'PENDING' } },
        { name: 'ORDER_PAID', payload: { ...ordPayload, status: 'PAID' } },
        { name: 'ORDER_EXPIRED', payload: { ...ordPayload, status: 'EXPIRED' } },
        { name: 'TRANSACTION_CREATED', payload: { ...txnPayload, status: 'PENDING' } },
        { name: 'TRANSACTION_COMPLETED', payload: { ...txnPayload, status: 'COMPLETED' } },
        { name: 'TRANSACTION_EXPIRED', payload: { ...txnPayload, status: 'EXPIRED' } },
        { name: 'CUSTOMER_CREATED', payload: cusPayload },
        { name: 'CUSTOMER_UPDATED', payload: { ...cusPayload, name: cusPayload.name + ' (Editado)' } },
        { name: 'CUSTOMER_DELETED', payload: { id: cusPayload.id } },
        { name: 'PRODUCT_CREATED', payload: prodPayload },
        { name: 'PRODUCT_UPDATED', payload: { ...prodPayload, price: Number(prodPayload.price || 0) + 100 } },
        { name: 'PRODUCT_DELETED', payload: { id: prodPayload.id } },
        { name: 'PRODUCT_OUT_OF_STOCK', payload: { product_id: prodPayload.id, status: 'OUT_OF_STOCK' } },
        { name: 'END_USER_REGISTERED', payload: { id: usrPayload.id, email: usrPayload.email } },
        { name: 'END_USER_LOGGED_IN', payload: { id: usrPayload.id, email: usrPayload.email } },
        { name: 'FILE_UPLOADED', payload: filePayload },
        { name: 'FILE_DELETED', payload: { id: filePayload.id } }
    ]

    let successCount = 0
    const results = []

    // 3. Fire them sequentially towards the target URL exactly as WebhookDispatcher would
    for (const testEvent of eventsToTest) {
        try {
            const testRes = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-GeniusBase-Event': testEvent.name,
                    'User-Agent': 'GeniusBase-Webhook/1.0'
                },
                body: JSON.stringify({
                    event: testEvent.name,
                    tenant_id: tenantId,
                    timestamp: new Date().toISOString(),
                    payload: testEvent.payload,
                    is_test_mode: true
                })
            })
            if (testRes.ok) successCount++
            results.push({ event: testEvent.name, status: testRes.status })
        } catch (err: any) {
            results.push({ event: testEvent.name, error: err.message })
        }
    }

    return {
        success: successCount > 0,
        successCount,
        total: eventsToTest.length,
        results
    }
}

// ── Command Registry ────────────────────────────────────────────────

export const commandRegistry: Record<string, RpcHandler> = {
    PING: async () => ({ pong: true, timestamp: new Date().toISOString() }),
    FETCH_DASHBOARD_STATS: fetchDashboardStats,
    FETCH_ANALYTICS: fetchAnalytics,

    // Users (End-Users)
    FETCH_USERS: fetchUsers,
    CREATE_USER: createUser,
    DELETE_USER: deleteUser,

    // Customers
    FETCH_CUSTOMERS: fetchCustomers,
    CREATE_CUSTOMER: createCustomer,

    // Products
    FETCH_PRODUCTS: fetchProducts,
    CREATE_PRODUCT: createProduct,

    // Igor Events
    FETCH_EVENTS: fetchEvents,

    // Payment Gateways (per-tenant credentials)
    FETCH_GATEWAYS: fetchGateways,
    SAVE_GATEWAY: saveGateway,

    // E-commerce Orders (Phase 13+)
    FETCH_ORDERS: fetchOrders,

    // Standalone Transactions (Phase 15+)
    FETCH_TRANSACTIONS: fetchTransactions,

    // Storage Files (Phase 17+)
    FETCH_FILES: fetchFiles,
    DELETE_FILE: deleteFile,

    // Webhooks (Phase 29.5+)
    FETCH_WEBHOOKS: fetchWebhooks,
    ADD_WEBHOOK: addWebhook,
    DELETE_WEBHOOK: deleteWebhook,
    TEST_WEBHOOK: testWebhook,
    TEST_ALL_WEBHOOK_EVENTS: testAllWebhookEvents,
}
