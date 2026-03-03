/**
 * Middleware Factory: RoleGuard
 * Root/Engine/src/middlewares/RoleGuard.ts
 */

import { createMiddleware } from 'hono/factory'
import { ForbiddenError } from '../domain/errors'
import type { AuthVariables } from '../types/auth'

export const RoleGuard = (allowedRoles: string[]) => {
    return createMiddleware<{
        Bindings: Env
        Variables: AuthVariables
    }>(async (c, next) => {
        const userRole = c.get('userRole')

        if (!userRole || !allowedRoles.includes(userRole)) {
            throw new ForbiddenError(
                `Access denied: role "${userRole}" is not authorized for this resource`,
                'INSUFFICIENT_PERMISSIONS'
            )
        }

        await next()
    })
}
