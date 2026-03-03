import { createMiddleware } from 'hono/factory'
import { TokenExtractor } from './TokenExtractor'
import { EdgeRLS } from './EdgeRLS'
import { RoleGuard } from './RoleGuard'
import type { AuthVariables } from '../types/auth'

export const apiKeyAuth = createMiddleware<{
    Bindings: Env
    Variables: AuthVariables
}>(async (c, next) => {
    // Manual Pipeline Wrapper
    await TokenExtractor(c, async () => {
        await EdgeRLS(c, async () => {
            await RoleGuard(['service', 'end_user', 'anon'])(c, next)
        })
    })
})
