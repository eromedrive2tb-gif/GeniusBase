/**
 * End-User Login Handler
 * Root/Engine/src/api/v1/auth/login.ts
 *
 * Responsabilidade única: Autenticar um End-User na tabela `tenant_users`.
 * Protegido pelo JWT do Tenant. Retorna um End-User JWT para o cliente final.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../../utils/router'
import { verifyPassword } from '../../../utils/crypto'
import { generateToken } from '../../../utils/token'
import { AuthLoginSchema } from '../../../domain/schemas'

const endUserLoginRoute = createAuthRouter()

endUserLoginRoute.post('/', async (c) => {
    // O tenantAuth.ts já validou a API Key do Dev e e injetou o tenantId
    const tenantId = c.get('tenantId') as string

    const rawBody = await c.req.json()
    const body = AuthLoginSchema.parse(rawBody)

    const email = body.email.trim().toLowerCase()
    const password = body.password

    // Buscar End-User pelo email E tenant_id
    const user = await c.env.DB.prepare(
        'SELECT id, password_hash FROM tenant_users WHERE tenant_id = ? AND email = ?'
    )
        .bind(tenantId, email)
        .first<{ id: string, password_hash: string }>()

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Verificar senha
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Gerar End-User JWT
    const secret = c.env.ENDUSER_JWT_SECRET
    if (!secret) {
        return c.json({ error: 'Server configuration error' }, 500)
    }

    const jti = crypto.randomUUID()

    // Este token é do tipo 'end_user'. O subject (sub) é o ID do End-User, não do Owner.
    const token = await generateToken({
        sub: user.id,
        tid: tenantId,
        jti,
        role: 'end_user'
    }, secret)

    // Armazenar sessão do End-User no KV (TTL = 24h)
    await c.env.KV_CACHE.put(`user_session:${jti}`, JSON.stringify({
        user_id: user.id,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
    }), { expirationTtl: 86400 })

    return c.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            email
        }
    })
})

export { endUserLoginRoute }
