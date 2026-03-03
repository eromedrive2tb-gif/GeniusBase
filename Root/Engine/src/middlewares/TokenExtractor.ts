/**
 * Middleware: TokenExtractor
 * Root/Engine/src/middlewares/TokenExtractor.ts
 */

import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../utils/token'
import { UnauthorizedError } from '../domain/errors'
import type { AuthVariables } from '../types/auth'

export const TokenExtractor = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Bearer token', 'MISSING_TOKEN')
    }

    const token = authHeader.slice(7)
    const secret = c.env.ENDUSER_JWT_SECRET

    if (!secret) {
        console.error('[TokenExtractor] ENDUSER_JWT_SECRET not configured')
        throw new Error('Internal Server Error')
    }

    try {
        const payload = await verifyToken(token, secret)

        // Inject context
        c.set('tenantId', payload.tid)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)
        c.set('jti', payload.jti)

        // Check active session in KV
        let sessionKey = ''
        if (payload.role === 'end_user') {
            sessionKey = `user_session:${payload.jti}`
        } else if (payload.role === 'anon') {
            sessionKey = `anon_session:${payload.jti}`
        } else {
            sessionKey = `session:${payload.jti}`
        }

        const session = await c.env.KV_CACHE.get(sessionKey)
        if (!session) {
            throw new UnauthorizedError('Session expired or revoked', 'SESSION_REVOKED')
        }

        await next()
    } catch (err) {
        if (err instanceof UnauthorizedError) throw err
        const message = err instanceof Error ? err.message : 'Invalid token'
        throw new UnauthorizedError('Unauthorized: ' + message, 'INVALID_TOKEN')
    }
})
