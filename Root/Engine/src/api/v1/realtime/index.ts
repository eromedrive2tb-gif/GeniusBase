/**
 * BaaS Realtime WebSocket Route
 * Root/Engine/src/api/v1/realtime/index.ts
 *
 * Responsabilidade única: Autenticar o cliente via token JWT na query string,
 * derivar o ID do Durable Object pelo tenantId (garantindo isolamento por tenant),
 * e fazer o upgrade do WebSocket para o RealtimeState DO.
 *
 * Fluxo:
 *   Client → GET /api/v1/realtime?token=<JWT> → [Worker validates] → DO fetch (upgrade)
 *
 * Por que query string e não header Authorization?
 * A Web WebSocket API nativa (new WebSocket(url)) NÃO permite enviar headers customizados.
 * O padrão da industria para isso é passar o token na query string e validá-lo no servidor.
 *
 * Segurança:
 * - Token validado com ENDUSER_JWT_SECRET (nunca o ADMIN_JWT_SECRET)
 * - Apenas roles 'end_user' e 'service' têm acesso
 * - Cada tenantId tem a sua própria instância de DO — sem cross-tenant data leaks
 */

import { Hono } from 'hono'
import { verifyToken } from '../../../utils/token'

const realtimeRoute = new Hono<{ Bindings: Env }>()

realtimeRoute.get('/', async (c) => {
    // 1. Extract token from query string (Web WebSocket API can't send custom headers)
    const token = c.req.query('token')

    if (!token) {
        return c.json({ error: 'Unauthorized: Missing token query parameter' }, 401)
    }

    // 2. Validate JWT with the BaaS-domain secret (ENDUSER_JWT_SECRET)
    const secret = c.env.ENDUSER_JWT_SECRET
    if (!secret) {
        console.error('[realtime] ENDUSER_JWT_SECRET not configured')
        return c.json({ error: 'Internal Server Error' }, 500)
    }

    let tenantId: string

    try {
        const payload = await verifyToken(token, secret)

        // 3. RBAC gate — only end_user, service, or anon tokens may open realtime connections
        if (payload.role !== 'end_user' && payload.role !== 'service' && payload.role !== 'anon') {
            return c.json(
                { error: 'Forbidden: Only end_user, service or anon tokens may use Realtime' },
                403
            )
        }

        tenantId = payload.tid
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid token'
        return c.json({ error: `Unauthorized: ${message}` }, 401)
    }

    if (!tenantId) {
        return c.json({ error: 'Unauthorized: Missing tenant context in token' }, 401)
    }

    // 4. Derive the DO instance by tenantId — this is the key to tenant isolation.
    //    All WebSocket clients of the same tenant share the same DO instance and "room".
    const doId = c.env.REALTIME_STATE.idFromName(tenantId)
    const stub = c.env.REALTIME_STATE.get(doId)

    // 5. Forward the raw WebSocket upgrade request to the DO.
    //    The DO's fetch() will call ctx.acceptWebSocket() and return the 101 response.
    return stub.fetch(c.req.raw)
})

export { realtimeRoute }
