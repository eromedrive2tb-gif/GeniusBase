/**
 * Admin Auth Middleware (Dashboard Internal)
 * Root/Engine/src/middlewares/adminAuth.ts
 *
 * Intercepts API requests for the internal dashboard,
 * validates the JWT (Hono native HS256), checks session validity in KV,
 * and injects tenant context. Retorna HTML/Redirect em caso de erro.
 */

import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../utils/token'
import type { AuthVariables } from '../types/auth'

export const adminAuth = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    // Accepts token from Authorization header or Cookie
    const cookieToken = getCookieValue(c.req.header('Cookie') || '', 'auth_token')
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : cookieToken

    if (!token) {
        return c.html(
            '<div class="alert alert-error" role="alert">Authentication required. Please log in.</div>',
            401
        )
    }

    try {
        const secret = c.env.ADMIN_JWT_SECRET
        if (!secret) {
            console.error('[adminAuth] ADMIN_JWT_SECRET not configured')
            return c.html(
                '<div class="alert alert-error" role="alert">Server configuration error.</div>',
                500
            )
        }

        // 1. Verify JWT signature and expiration
        const payload = await verifyToken(token, secret)

        // Ensure it is an admin/owner token, not an end-user token
        if (payload.role === 'end_user') {
            return c.html(
                '<div class="alert alert-error" role="alert">Acesso restrito a administradores.</div>',
                403
            )
        }

        // 2. Check if the session (JTI) is active in KV
        const sessionKey = `session:${payload.jti}`
        const session = await c.env.KV_CACHE.get(sessionKey)

        if (!session) {
            return c.html(
                '<div class="alert alert-error" role="alert">Session expired or revoked. Please log in again.</div>',
                401
            )
        }

        // 3. Inject tenant context into Hono's context
        c.set('tenantId', payload.tid)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)

        await next()
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid token'
        console.error('[adminAuth] Token validation failed:', message)

        return c.html(
            `<div class="alert alert-error" role="alert">${escapeHtml(message)}</div>`,
            401
        )
    }
})

function getCookieValue(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
