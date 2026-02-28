/** @jsxImportSource hono/jsx */

/**
 * Internal Dashboard Data Handler
 * Root/Engine/src/api/internal/dashboard.tsx
 *
 * Responsabilidade única: Buscar e agregar os dados de runtime do Tenant
 * (users, customers, products) para o SSR da página /dashboard.
 * Protegido por adminAuth — nunca exposto publicamente.
 */

import { Hono } from 'hono'
import { adminAuth } from '../../middlewares/adminAuth'
import { Home } from '../../../../Dashboard/src/pages/Home'

const internalDashboardRoute = new Hono<{ Bindings: Env }>()

// Toda requisição a esta rota exige autenticação de administrador
internalDashboardRoute.use('*', adminAuth)

internalDashboardRoute.get('/', async (c) => {
    const tenantId = c.get('tenantId' as never) as string

    // Busca paralela dos 3 datasets — sem bloquear a thread além do necessário
    const [usersResult, customersResult, productsResult] = await Promise.all([
        c.env.DB.prepare(
            'SELECT id, email, created_at FROM tenant_users WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
        )
            .bind(tenantId)
            .all(),

        c.env.DB.prepare(
            'SELECT id, name, email, created_at FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
        )
            .bind(tenantId)
            .all(),

        c.env.DB.prepare(
            'SELECT id, name, price, stock, created_at FROM products WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
        )
            .bind(tenantId)
            .all(),
    ])

    return c.html(
        <Home
            users={usersResult.results ?? []}
            customers={customersResult.results ?? []}
            products={productsResult.results ?? []}
        />
    )
})

export { internalDashboardRoute }
