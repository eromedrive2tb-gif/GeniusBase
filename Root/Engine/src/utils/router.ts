import { Hono } from 'hono'
import type { AuthVariables } from '../types/auth'

export type { AuthVariables }

/**
 * Factory for creating Hono routers with predefined environment and auth variable types.
 * This completely eliminates the need for `c.get('tenantId' as never) as string`.
 */
export const createAuthRouter = () => {
    return new Hono<{ Bindings: Env; Variables: AuthVariables }>()
}
