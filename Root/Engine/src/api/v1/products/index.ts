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
import { ProductCreateSchema } from '../../../domain/schemas'
import { WebhookDispatcher } from '../../../domain/events/WebhookDispatcher'

const productsRoute = createAuthRouter()

// Protege todas as rotas neste app com o middleware tenantAuth
productsRoute.use('*', apiKeyAuth)

// List Products
productsRoute.get('/', async (c) => {
    const tenantId = c.get('tenantId') as string

    // Pagination & Sort parameters (Rigid Parsing)
    const rawLimit = parseInt(c.req.query('limit') || '50', 10)
    const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100)
    const rawOffset = parseInt(c.req.query('offset') || '0', 10)
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC'

    // Isola as queries por tenant usando c.get('tenantId') ignorando os soft deletes
    const { results } = await c.env.DB.prepare(
        `SELECT * FROM products WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY created_at ${order} LIMIT ? OFFSET ?`
    )
        .bind(tenantId, limit, offset)
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
    const rawBody = await c.req.json()

    // Type coerce for string-based payloads (HTMX forms) before strict checking
    const body = ProductCreateSchema.parse({
        ...rawBody,
        price: Number(rawBody.price),
        stock: rawBody.stock ? Number(rawBody.stock) : undefined
    })

    const price = body.price
    const stock = body.stock

    const id = `prod_${crypto.randomUUID().replace(/-/g, '')}`
    const now = new Date().toISOString()

    const metadataRaw = body.metadata ? JSON.stringify(body.metadata) : null

    try {
        await c.env.DB.prepare(
            'INSERT INTO products (id, tenant_id, name, price, stock, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
            .bind(id, tenantId, body.name, price, stock, metadataRaw, now)
            .run()

        const record = {
            id,
            name: body.name,
            price, // Using the integer var, not the raw request string
            stock,
            metadata: body.metadata || {},
            created_at: now,
        }

        try {
            c.executionCtx.waitUntil(
                WebhookDispatcher.dispatch(c.env, tenantId, 'PRODUCT_CREATED', record)
            )
        } catch { }

        return c.json({ data: record }, 201)
    } catch (e: any) {
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
})

// Get Unit by ID
productsRoute.get('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL').bind(id, tenantId).first()

    if (!product) return c.json({ error: 'Product not found' }, 404)

    if (product.metadata) {
        try {
            product.metadata = JSON.parse(product.metadata as string)
        } catch {
            product.metadata = {}
        }
    } else {
        product.metadata = {}
    }

    return c.json({ data: product })
})

// Patch (Partial Update)
productsRoute.patch('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const rawBody = await c.req.json()

    // Strict partial validation with Zod
    const body = ProductCreateSchema.partial().parse(rawBody)

    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name) }
    if (body.price !== undefined) { updates.push('price = ?'); values.push(Number(body.price)) }
    if (body.stock !== undefined) { updates.push('stock = ?'); values.push(Number(body.stock)) }
    if (body.metadata !== undefined) { updates.push('metadata = ?'); values.push(body.metadata ? JSON.stringify(body.metadata) : null) }

    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)

    values.push(id, tenantId)

    await c.env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`).bind(...values).run()

    try {
        c.executionCtx.waitUntil(
            WebhookDispatcher.dispatch(c.env, tenantId, 'PRODUCT_UPDATED', { id, ...body })
        )
    } catch { }

    return c.json({ message: 'Product updated successfully' })
})

// Delete (Soft Delete)
productsRoute.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const now = new Date().toISOString()

    await c.env.DB.prepare(`UPDATE products SET deleted_at = ? WHERE id = ? AND tenant_id = ?`).bind(now, id, tenantId).run()

    try {
        c.executionCtx.waitUntil(
            WebhookDispatcher.dispatch(c.env, tenantId, 'PRODUCT_DELETED', { id, deleted_at: now })
        )
    } catch { }

    return c.json({ message: 'Product deleted successfully' })
})

export { productsRoute }
