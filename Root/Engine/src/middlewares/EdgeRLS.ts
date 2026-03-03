/**
 * Middleware: EdgeRLS
 * Root/Engine/src/middlewares/EdgeRLS.ts
 */

import { createMiddleware } from 'hono/factory'
import { ForbiddenError } from '../domain/errors'
import type { AuthVariables } from '../types/auth'

export const EdgeRLS = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    const userRole = c.get('userRole')
    const method = c.req.method.toUpperCase()
    const pathname = c.req.path

    if (userRole === 'anon' && method !== 'GET') {
        const isAllowedPost = method === 'POST' && (
            pathname.endsWith('/api/v1/auth/login') ||
            pathname.endsWith('/api/v1/auth/register') ||
            pathname.endsWith('/api/v1/events') ||
            pathname.endsWith('/api/v1/orders') ||
            pathname.endsWith('/api/v1/transactions')
        )

        if (!isAllowedPost) {
            throw new ForbiddenError(
                'Anonymous keys have read-only or strictly limited access',
                'ANON_RESTRICTED'
            )
        }
    }

    await next()
})
