/**
 * End-User Register Handler
 * Root/Engine/src/api/v1/auth/register.ts
 *
 * Responsabilidade única: Criar um End-User na tabela `tenant_users`.
 * Protegido pelo JWT do Tenant, o que garante injeção segura de `tenant_id`.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../../utils/router'
import { hashPassword } from '../../../utils/crypto'
import { AuthRegisterSchema } from '../../../domain/schemas'
import { WebhookDispatcher } from '../../../domain/events/WebhookDispatcher'

const endUserRegisterRoute = createAuthRouter()

endUserRegisterRoute.post('/', async (c) => {
    // O apiKeyAuth.ts já validou o token e injetou os metadados.
    // Apenas a Service API Key do Tenant pode disparar criação de usuários anônimos.
    const tenantId = c.get('tenantId') as string
    const userRole = c.get('userRole') as string

    if (userRole !== 'service') {
        return c.json({ error: 'Forbidden: Only service API keys can register new end-users' }, 403)
    }

    const rawBody = await c.req.json()
    const body = AuthRegisterSchema.parse(rawBody)

    const email = body.email.trim().toLowerCase()
    const password = body.password

    // Verificar se já existe neste tenant
    const existing = await c.env.DB.prepare(
        'SELECT id FROM tenant_users WHERE tenant_id = ? AND email = ?'
    )
        .bind(tenantId, email)
        .first()

    if (existing) {
        return c.json({ error: 'Email already registered in this workspace' }, 409)
    }

    const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`
    const passwordHash = await hashPassword(password)
    const now = new Date().toISOString()

    // CRM Identity Auto-Capture
    const customerId = `cus_${crypto.randomUUID().replace(/-/g, '')}`
    const nameStr = typeof rawBody.name === 'string' && rawBody.name.trim() !== '' ? rawBody.name.trim() : null

    try {
        await c.env.DB.batch([
            c.env.DB.prepare(
                'INSERT INTO tenant_users (id, tenant_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(id, tenantId, email, passwordHash, now),
            c.env.DB.prepare(
                'INSERT INTO tenant_customers (id, tenant_id, name, email, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(customerId, tenantId, nameStr ?? email, email, now)
        ])

        // Não retorna a senha no payload
        const record = {
            id,
            email,
            created_at: now,
        }

        try {
            c.executionCtx.waitUntil(
                WebhookDispatcher.dispatch(c.env, tenantId, 'END_USER_REGISTERED', record)
            )
        } catch { }

        return c.json({ data: record }, 201)
    } catch (e: any) {
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
})

export { endUserRegisterRoute }
