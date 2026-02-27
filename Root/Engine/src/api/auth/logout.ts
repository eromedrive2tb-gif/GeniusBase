/**
 * Logout Handler
 * Root/Engine/src/api/auth/logout.ts
 *
 * Responsabilidade única: revogar sessão (deletar JTI do KV)
 * e limpar o cookie de autenticação.
 */

import { Hono } from 'hono'
import type { AuthVariables } from '../../types/auth'
import { verifyToken } from '../../utils/token'
import { successAlert } from '../../utils/htmlFragments'
import { tenantAuth } from '../../middlewares/tenantAuth'

const logoutRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

logoutRoute.post('/', tenantAuth, async (c) => {
    const authHeader = c.req.header('Authorization')
    const cookieHeader = c.req.header('Cookie') || ''
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/)

    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : cookieMatch ? decodeURIComponent(cookieMatch[1]) : null

    if (token) {
        const secret = (c.env as unknown as Record<string, string>)['JWT_SECRET']
        if (secret) {
            try {
                const payload = await verifyToken(token, secret)
                await c.env.KV_CACHE.delete(`session:${payload.jti}`)
            } catch {
                // Token inválido — limpeza de sessão é best-effort
            }
        }
    }

    // Limpar cookie
    c.header('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0')
    c.header('HX-Redirect', '/login')

    return c.html(successAlert('Logged out successfully.'))
})

export { logoutRoute }
