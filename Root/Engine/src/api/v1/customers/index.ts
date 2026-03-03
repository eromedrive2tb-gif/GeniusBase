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
import { CustomerCreateSchema } from '../../../domain/schemas'
import { WebhookDispatcher } from '../../../domain/events/WebhookDispatcher'

const customersRoute = createAuthRouter()

// Protege todas as rotas neste app com o middleware tenantAuth
customersRoute.use('*', apiKeyAuth)

// List Customers
customersRoute.get('/', async (c) => {
    const tenantId = c.get('tenantId') as string

    // Pagination & Sort parameters (Rigid Parsing)
    const rawLimit = parseInt(c.req.query('limit') || '50', 10)
    const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100)
    const rawOffset = parseInt(c.req.query('offset') || '0', 10)
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC'

    // Isola as queries por tenant usando c.get('tenantId') ignorando soft deletes
    const { results } = await c.env.DB.prepare(
        `SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY created_at ${order} LIMIT ? OFFSET ?`
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

// Create Customer
customersRoute.post('/', async (c) => {
    const tenantId = c.get('tenantId') as string
    const rawBody = await c.req.json()
    const body = CustomerCreateSchema.parse(rawBody)

    const id = `cus_${crypto.randomUUID().replace(/-/g, '')}`
    const now = new Date().toISOString()

    const metadataRaw = body.metadata ? JSON.stringify(body.metadata) : null

    try {
        await c.env.DB.prepare(
            'INSERT INTO customers (id, tenant_id, name, email, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
            .bind(id, tenantId, body.name, body.email || null, metadataRaw, now)
            .run()

        const record = {
            id,
            name: body.name,
            email: body.email,
            metadata: body.metadata || {},
            created_at: now,
        }

        try {
            c.executionCtx.waitUntil(
                WebhookDispatcher.dispatch(c.env, tenantId, 'CUSTOMER_CREATED', record)
            )
        } catch { }

        return c.json({ data: record }, 201)
    } catch (e: any) {
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
})

// Get Unit by ID
customersRoute.get('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL').bind(id, tenantId).first()

    if (!customer) return c.json({ error: 'Customer not found' }, 404)

    if (customer.metadata) {
        try {
            customer.metadata = JSON.parse(customer.metadata as string)
        } catch {
            customer.metadata = {}
        }
    } else {
        customer.metadata = {}
    }

    return c.json({ data: customer })
})

// Patch (Partial Update)
customersRoute.patch('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const rawBody = await c.req.json()

    // Strict partial validation with Zod
    const body = CustomerCreateSchema.partial().parse(rawBody)

    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name) }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email) }
    if (body.document !== undefined) { updates.push('document = ?'); values.push(body.document) }
    if (body.metadata !== undefined) { updates.push('metadata = ?'); values.push(body.metadata ? JSON.stringify(body.metadata) : null) }

    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)

    values.push(id, tenantId)

    await c.env.DB.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`).bind(...values).run()

    try {
        c.executionCtx.waitUntil(
            WebhookDispatcher.dispatch(c.env, tenantId, 'CUSTOMER_UPDATED', { id, ...body })
        )
    } catch { }

    return c.json({ message: 'Customer updated successfully' })
})

// Delete (Soft Delete)
customersRoute.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId') as string
    const id = c.req.param('id')
    const now = new Date().toISOString()

    await c.env.DB.prepare(`UPDATE customers SET deleted_at = ? WHERE id = ? AND tenant_id = ?`).bind(now, id, tenantId).run()

    try {
        c.executionCtx.waitUntil(
            WebhookDispatcher.dispatch(c.env, tenantId, 'CUSTOMER_DELETED', { id, deleted_at: now })
        )
    } catch { }

    return c.json({ message: 'Customer deleted successfully' })
})

export { customersRoute }
