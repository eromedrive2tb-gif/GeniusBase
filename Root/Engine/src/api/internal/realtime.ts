/**
 * Internal Dashboard RPC WebSocket Route
 * Root/Engine/src/api/internal/realtime.ts
 *
 * Responsabilidade única: Autenticar o admin via cookie de sessão (adminAuth),
 * injetar o tenantId como header customizado, e fazer o upgrade do WebSocket
 * para o DashboardRPCState DO do respectivo Tenant.
 *
 * Fluxo:
 *   Browser → GET /api/internal/realtime (cookie auth_token automático)
 *   → adminAuth valida JWT + KV session → tenantId injetado no contexto
 *   → Novo Request com header 'x-tenant-id' → forwarded ao DashboardRPCState DO
 *   → DO aceita WebSocket e taga com 'tid:<tenantId>' para uso nos handlers
 */

import { Hono } from 'hono'
import { adminAuth } from '../../middlewares/adminAuth'
import type { AuthVariables } from '../../types/auth'

const internalRealtimeRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

internalRealtimeRoute.use('*', adminAuth)

internalRealtimeRoute.get('/', async (c) => {
    const upgradeHeader = c.req.header('Upgrade')
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return c.json({ error: 'WebSocket Upgrade Required' }, 426)
    }

    const tenantId = c.get('tenantId')
    if (!tenantId) {
        return c.json({ error: 'Unauthorized: Missing tenant context' }, 401)
    }

    const doId = c.env.DASHBOARD_RPC_STATE.idFromName(tenantId)
    const stub = c.env.DASHBOARD_RPC_STATE.get(doId)

    // Clone the raw request and inject tenantId as a header.
    // The DO's fetch() reads this header to tag the WebSocket with the tenantId,
    // making it available to RPC handlers without any persistent DO state.
    const forwardedRequest = new Request(c.req.raw, {
        headers: {
            ...Object.fromEntries(c.req.raw.headers.entries()),
            'x-tenant-id': tenantId,
        },
    })

    return stub.fetch(forwardedRequest)
})

export { internalRealtimeRoute }
