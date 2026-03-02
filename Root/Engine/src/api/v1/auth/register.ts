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

const endUserRegisterRoute = createAuthRouter()

endUserRegisterRoute.post('/', async (c) => {
    // O apiKeyAuth.ts já validou o token e injetou os metadados.
    // Apenas a Service API Key do Tenant pode disparar criação de usuários anônimos.
    const tenantId = c.get('tenantId') as string
    const userRole = c.get('userRole') as string

    if (userRole !== 'service') {
        return c.json({ error: 'Forbidden: Only service API keys can register new end-users' }, 403)
    }

    const body = await c.req.json().catch(() => null)
    if (!body || !body.email || !body.password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }

    const email = body.email.trim().toLowerCase()
    const password = body.password

    if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

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
    const now = Math.floor(Date.now() / 1000)

    try {
        await c.env.DB.prepare(
            'INSERT INTO tenant_users (id, tenant_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
        )
            .bind(id, tenantId, email, passwordHash, now)
            .run()

        // Não retorna a senha no payload
        return c.json(
            {
                data: {
                    id,
                    email,
                    created_at: now,
                },
            },
            201
        )
    } catch (e: any) {
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
})

export { endUserRegisterRoute }
