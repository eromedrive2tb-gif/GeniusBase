/**
 * Login Handler
 * Root/Engine/src/api/auth/login.ts
 *
 * Responsabilidade única: autenticar um usuário existente,
 * gerar JWT e armazenar sessão no KV.
 */

import { Hono } from 'hono'
import type { Tenant, User } from '../../types/auth'
import { verifyPassword } from '../../utils/crypto'
import { generateToken } from '../../utils/token'
import { emitAuthEvent, extractRequestMeta } from '../../events/authEvents'
import { errorAlert, successAlert } from '../../utils/htmlFragments'

const loginRoute = new Hono<{ Bindings: Env }>()

loginRoute.post('/', async (c) => {
    const body = await c.req.parseBody()
    const email = (body['email'] as string || '').trim().toLowerCase()
    const password = body['password'] as string || ''

    const meta = extractRequestMeta(c)

    // Validação de input
    if (!email || !password) {
        return c.html(errorAlert('E-mail e senha são obrigatórios.'), 400)
    }

    // Buscar usuário pelo email (assumindo email único globalmente devido ao auto-provisionamento)
    const user = await c.env.DB.prepare(
        'SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = ?'
    )
        .bind(email)
        .first<User>()

    if (!user) {
        emitAuthEvent(c, {
            tenant_id: null,
            user_id: null,
            event_type: 'AUTH_FAILED',
            ...meta,
            metadata: { reason: 'invalid_credentials', email },
        })
        return c.html(errorAlert('Credenciais inválidas.'), 401)
    }

    // Verificar senha
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
        emitAuthEvent(c, {
            tenant_id: user.tenant_id,
            user_id: user.id,
            event_type: 'AUTH_FAILED',
            ...meta,
            metadata: { reason: 'wrong_password' },
        })
        return c.html(errorAlert('Credenciais inválidas.'), 401)
    }

    // Gerar JWT
    const secret = c.env.ADMIN_JWT_SECRET
    if (!secret) {
        console.error('[auth/login] ADMIN_JWT_SECRET not configured')
        return c.html(errorAlert('Erro de configuração do servidor.'), 500)
    }

    const jti = crypto.randomUUID()
    const token = await generateToken({ sub: user.id, tid: user.tenant_id, jti, role: user.role }, secret)

    // Armazenar sessão no KV (TTL = 24h)
    await c.env.KV_CACHE.put(`session:${jti}`, JSON.stringify({
        user_id: user.id,
        tenant_id: user.tenant_id,
        created_at: new Date().toISOString(),
    }), { expirationTtl: 86400 })

    // EDA: emitir evento em background
    emitAuthEvent(c, {
        tenant_id: user.tenant_id,
        user_id: user.id,
        event_type: 'AUTH_SUCCESS',
        ...meta,
        metadata: { jti },
    })

    // Cookie HttpOnly + HTMX redirect
    c.header('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`)
    c.header('HX-Redirect', '/dashboard')

    return c.html(successAlert('Login realizado com sucesso. Redirecionando...'))
})

export { loginRoute }
