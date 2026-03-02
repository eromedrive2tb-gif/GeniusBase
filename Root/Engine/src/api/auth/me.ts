/**
 * GET /api/auth/me
 * Root/Engine/src/api/auth/me.ts
 *
 * Responsabilidade: Retornar os dados do usuário atual e as informações
 * básicas do seu Tenant (Workspace), para consumo pelo Dashboard.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { adminAuth } from '../../middlewares/adminAuth'

const meRoute = createAuthRouter()

meRoute.use('*', adminAuth)

meRoute.get('/', async (c) => {
    const userId = c.get('userId') as string
    const tenantId = c.get('tenantId') as string

    // Busca o usuário logado
    const user = await c.env.DB.prepare(
        'SELECT id, email, role, created_at FROM users WHERE id = ? AND tenant_id = ?'
    )
        .bind(userId, tenantId)
        .first()

    if (!user) {
        return c.json({ error: 'User not found' }, 404)
    }

    // Busca as informações do Tenant (Workspace)
    const tenant = await c.env.DB.prepare(
        'SELECT id, name, slug, created_at FROM tenants WHERE id = ?'
    )
        .bind(tenantId)
        .first()

    if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404)
    }

    return c.json({
        user,
        tenant
    })
})

export { meRoute }
