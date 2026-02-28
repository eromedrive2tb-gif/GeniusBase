/**
 * End-User Auth Router
 * Root/Engine/src/api/v1/auth/index.ts
 *
 * Responsabilidade: Roteador principal para autenticação de clientes (End-Users)
 * do Tenant (BaaS). Requer que a requisição venha assinada com o Token JWT do Tenant
 * garantindo que o End-User seja criado/autenticado no escopo correto.
 */

import { Hono } from 'hono'
import { tenantAuth } from '../../../middlewares/tenantAuth'
import { endUserRegisterRoute } from './register'
import { endUserLoginRoute } from './login'

const endUserAuthRoutes = new Hono<{ Bindings: Env }>()

// Todas as rotas de Auth de End-Users exigem a API Key do Tenant
endUserAuthRoutes.use('*', tenantAuth)

// Registrar End-User no Tenant Atual
endUserAuthRoutes.route('/register', endUserRegisterRoute)

// Logar End-User no Tenant Atual
endUserAuthRoutes.route('/login', endUserLoginRoute)

export { endUserAuthRoutes }
