/**
 * Tenant Auth Middleware
 * Root/Engine/src/middlewares/tenantAuth.ts
 *
 * Intercepts API requests, validates the JWT (Hono native HS256),
 * checks session validity in KV, and injects tenant context.
 */

import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../utils/token'
import type { AuthVariables } from '../types/auth'

/**
 * Hono middleware that enforces JWT authentication and multi-tenant isolation.
 *
 * On success, sets:
 *   - c.get('tenantId') → tenant ID from token
 *   - c.get('userId')   → user ID from token
 *   - c.get('userRole') → user role from token
 *
 * On failure, returns 401 with an HTMX-compatible HTML error fragment.
 */
export const tenantAuth = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    // Also check for token in cookies (for browser-based HTMX flows)
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
        const secret = (c.env as unknown as Record<string, string>)['JWT_SECRET']
        if (!secret) {
            console.error('[tenantAuth] JWT_SECRET not configured')
            return c.html(
                '<div class="alert alert-error" role="alert">Server configuration error.</div>',
                500
            )
        }

        // 1. Verify JWT signature and expiration via Hono native
        const payload = await verifyToken(token, secret)

        // 2. Check if the session (JTI) is still active in KV
        const sessionKey = `session:${payload.jti}`
        const session = await c.env.KV_CACHE.get(sessionKey)

        if (!session) {
            return c.html(
                '<div class="alert alert-error" role="alert">Session expired or revoked. Please log in again.</div>',
                401
            )
        }

        // 3. Inject tenant context into Hono's context for downstream handlers
        c.set('tenantId', payload.tid)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)

        await next()
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid token'
        console.error('[tenantAuth] Token validation failed:', message)

        return c.html(
            `<div class="alert alert-error" role="alert">${escapeHtml(message)}</div>`,
            401
        )
    }
})

/**
 * Parse a specific cookie value from the Cookie header.
 */
function getCookieValue(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
}

/**
 * Minimal HTML escaping to prevent XSS in error messages.
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
