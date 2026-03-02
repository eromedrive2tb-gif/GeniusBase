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
    const now = Math.floor(Date.now() / 1000)

    await env.DB.prepare(
        'INSERT INTO tenant_users (id, tenant_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tenantId, email, passwordHash, now).run()

    const record = { id, tenant_id: tenantId, email, created_at: now }
    broadcast('USER_CREATED', record)
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
    return { deleted: true, id }
}

// ─── Customers ─────────────────────────────────────────────

const fetchCustomers: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all()
    return results
}

const createCustomer: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const name = (typeof payload['name'] === 'string' ? payload['name'] : '').trim()
    const email = (typeof payload['email'] === 'string' ? payload['email'] : '').trim()

    if (!name) throw new Error('O nome do cliente é obrigatório.')

    const id = `cus_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    await env.DB.prepare(
        'INSERT INTO customers (id, tenant_id, name, email, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tenantId, name, email || null, now).run()

    const record = { id, tenant_id: tenantId, name, email: email || null, created_at: now }
    broadcast('CUSTOMER_CREATED', record)
    return record
}

// ─── Products ──────────────────────────────────────────────

const fetchProducts: RpcHandler = async ({ tenantId, env }) => {
    const { results } = await env.DB.prepare(
        'SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(tenantId).all()
    return results
}

const createProduct: RpcHandler = async ({ payload, tenantId, env, broadcast }) => {
    const name = (typeof payload['name'] === 'string' ? payload['name'] : '').trim()
    const price = Number(payload['price'])
    const stock = Number(payload['stock']) || 0

    if (!name || isNaN(price) || price < 0) {
        throw new Error('Nome e Preço (número válido, em centavos) são obrigatórios.')
    }

    const id = `prod_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    await env.DB.prepare(
        'INSERT INTO products (id, tenant_id, name, price, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, tenantId, name, price, stock, now).run()

    const record = { id, tenant_id: tenantId, name, price, stock, created_at: now }
    broadcast('PRODUCT_CREATED', record)
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

// ─── Dashboard Stats ────────────────────────────────────────────

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
    const now = Math.floor(Date.now() / 1000)

    await env.DB.prepare(
        `INSERT INTO tenant_gateways (id, tenant_id, provider, credentials, is_active, updated_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(tenant_id, provider) DO UPDATE SET
             credentials = excluded.credentials,
             is_active   = 1,
             updated_at  = excluded.updated_at`
    ).bind(id, tenantId, provider, credentialsStr, now).run()

    return { provider, is_active: true, updated_at: now }
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
    ).bind(tenantId).all()
    return results ?? []
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

// ── Command Registry ────────────────────────────────────────────────

export const commandRegistry: Record<string, RpcHandler> = {
    PING: async () => ({ pong: true, timestamp: new Date().toISOString() }),
    FETCH_DASHBOARD_STATS: fetchDashboardStats,

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
}
