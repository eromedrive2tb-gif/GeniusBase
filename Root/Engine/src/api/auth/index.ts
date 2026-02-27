/**
 * Auth Router Barrel
 * Root/Engine/src/api/auth/index.ts
 *
 * Responsabilidade única: montar o sub-router de autenticação
 * compondo os handlers individuais de login, logout e register.
 */

import { Hono } from 'hono'
import { loginRoute } from './login'
import { logoutRoute } from './logout'
import { registerRoute } from './register'

const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.route('/login', loginRoute)
authRoutes.route('/logout', logoutRoute)
authRoutes.route('/register', registerRoute)

export { authRoutes }
