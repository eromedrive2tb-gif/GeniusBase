import { Hono } from 'hono'

// Exporting the standard Variables expected from Auth Middlewares
export type AuthVariables = {
    tenantId: string
    userId?: string
    userRole?: string
}

/**
 * Factory for creating Hono routers with predefined environment and auth variable types.
 * This completely eliminates the need for `c.get('tenantId' as never) as string`.
 */
export const createAuthRouter = () => {
    return new Hono<{ Bindings: Env; Variables: AuthVariables }>()
}
