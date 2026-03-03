/**
 * GET, POST /api/v1/customers
 * Root/Engine/src/api/v1/customers/index.ts
 *
 * Responsabilidade: CRUD Básico de Customers, escopado pelo tenant.
 * Padrão S.O.L.I.D: tenant_id extraído via Middleware, nunca do Body.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../../utils/router'
import { apiKeyAuth } from '../../../middlewares/apiKeyAuth'

const customersRoute = createAuthRouter()

// Protege todas as rotas neste app com o middleware tenantAuth
customersRoute.use('*', apiKeyAuth)

// List Customers
customersRoute.get('/', async (c) => {
    const tenantId = c.get('tenantId') as string

    // Isola as queries por tenant usando c.get('tenantId')
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
    )
        .bind(tenantId)
        .all()

    // Deserialize metadata back to JSON object
    for (const row of results) {
        if (row.metadata) {
            try {
                row.metadata = JSON.parse(row.metadata as string)
            } catch {
                row.metadata = {}
            }
        } else {
            row.metadata = {}
        }
    }

    return c.json({ data: results })
})

// Create Customer
customersRoute.post('/', async (c) => {
    const tenantId = c.get('tenantId') as string
    const body = await c.req.json()

    if (!body.name) {
        return c.json({ error: 'Name is required' }, 400)
    }

    const id = `cus_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    const metadataRaw = body.metadata ? JSON.stringify(body.metadata) : null

    try {
        await c.env.DB.prepare(
            'INSERT INTO customers (id, tenant_id, name, email, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
            .bind(id, tenantId, body.name, body.email || null, metadataRaw, now)
            .run()

        return c.json(
            {
                data: {
                    id,
                    name: body.name,
                    email: body.email,
                    metadata: body.metadata || {},
                    created_at: now,
                },
            },
            201
        )
    } catch (e: any) {
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
})

export { customersRoute }
