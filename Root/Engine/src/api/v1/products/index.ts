/**
 * GET, POST /api/v1/products
 * Root/Engine/src/api/v1/products/index.ts
 *
 * Responsabilidade: CRUD Básico de Products, escopado pelo tenant.
 * Padrão S.O.L.I.D: tenant_id extraído via Middleware, nunca do Body.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../../utils/router'
import { apiKeyAuth } from '../../../middlewares/apiKeyAuth'

const productsRoute = createAuthRouter()

// Protege todas as rotas neste app com o middleware tenantAuth
productsRoute.use('*', apiKeyAuth)

// List Products
productsRoute.get('/', async (c) => {
    const tenantId = c.get('tenantId') as string

    // Isola as queries por tenant usando c.get('tenantId')
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'
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

// Create Product
productsRoute.post('/', async (c) => {
    const tenantId = c.get('tenantId') as string
    const body = await c.req.json()

    // Ensure price and stock are treated as numbers regardless of HTMX JSON string encoding
    const price = Number(body.price)
    const stock = Number(body.stock) || 0

    if (!body.name || isNaN(price)) {
        return c.json({ error: 'Name and a valid numeric price are required' }, 400)
    }

    const id = `prod_${crypto.randomUUID().replace(/-/g, '')}`
    const now = Math.floor(Date.now() / 1000)

    const metadataRaw = body.metadata ? JSON.stringify(body.metadata) : null

    try {
        await c.env.DB.prepare(
            'INSERT INTO products (id, tenant_id, name, price, stock, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
            .bind(id, tenantId, body.name, price, stock, metadataRaw, now)
            .run()

        return c.json(
            {
                data: {
                    id,
                    name: body.name,
                    price, // Using the integer var, not the raw request string
                    stock,
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

export { productsRoute }
