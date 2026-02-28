/**
 * API Key Auth Middleware (BaaS End-User API)
 * Root/Engine/src/middlewares/apiKeyAuth.ts
 *
 * Middleware for Public BaaS endpoints (/api/v1/*).
 * Strictly requires Authorization Bearer token (API Key or End-User JWT).
 * NEVER checks cookies. Returns ONLY JSON responses.
 */

import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../utils/token'
import type { AuthVariables } from '../types/auth'

export const apiKeyAuth = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing or invalid Bearer token' }, 401)
    }

    const token = authHeader.slice(7)

    try {
        const secret = c.env.ENDUSER_JWT_SECRET
        if (!secret) {
            console.error('[apiKeyAuth] ENDUSER_JWT_SECRET not configured')
            return c.json({ error: 'Internal Server Error' }, 500)
        }

        // 1. Verify JWT signature and expiration
        const payload = await verifyToken(token, secret)

        // 2. RBAC gate — only end_user and service tokens may access BaaS endpoints.
        // Admin/owner tokens are strictly forbidden here to enforce domain isolation.
        if (payload.role !== 'end_user' && payload.role !== 'service') {
            return c.json(
                { error: 'Forbidden: Admin tokens cannot access BaaS endpoints' },
                403
            )
        }

        // 3. Check active session in KV based on the role
        let sessionKey = ''
        if (payload.role === 'end_user') {
            sessionKey = `user_session:${payload.jti}`
        } else {
            // service tokens use the tenant session namespace
            sessionKey = `session:${payload.jti}`
        }

        const session = await c.env.KV_CACHE.get(sessionKey)

        if (!session) {
            return c.json({ error: 'Unauthorized: Session expired or revoked' }, 401)
        }

        // 3. Inject context
        c.set('tenantId', payload.tid)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)

        await next()
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid token'
        console.error('[apiKeyAuth] Token validation failed:', message)

        return c.json({ error: 'Unauthorized: ' + message }, 401)
    }
})
