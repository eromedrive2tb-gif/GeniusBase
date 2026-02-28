/**
 * Register Handler
 * Root/Engine/src/api/auth/register.ts
 *
 * Responsabilidade única: criar um novo usuário dentro
 * de um tenant existente, com hash de senha via PBKDF2.
 */

import { Hono } from 'hono'
import type { Tenant, User } from '../../types/auth'
import { hashPassword } from '../../utils/crypto'
import { emitAuthEvent, extractRequestMeta } from '../../events/authEvents'
import { errorAlert, successAlert } from '../../utils/htmlFragments'

const registerRoute = new Hono<{ Bindings: Env }>()

registerRoute.post('/', async (c) => {
    const body = await c.req.parseBody()
    const email = (body['email'] as string || '').trim().toLowerCase()
    const password = body['password'] as string || ''
    const confirmPassword = body['confirm_password'] as string || ''

    const meta = extractRequestMeta(c)

    // Validação de input
    if (!email || !password || !confirmPassword) {
        return c.html(errorAlert('Todos os campos são obrigatórios.'), 400)
    }

    if (password.length < 8) {
        return c.html(errorAlert('A senha deve ter pelo menos 8 caracteres.'), 400)
    }

    if (password !== confirmPassword) {
        return c.html(errorAlert('As senhas não coincidem.'), 400)
    }

    // Verificar se já existe um usuário com este email globalmente
    const existing = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
    )
        .bind(email)
        .first<User>()

    if (existing) {
        return c.html(errorAlert('Uma conta com este e-mail já existe.'), 409)
    }

    // Criar o hash da senha
    const passwordHash = await hashPassword(password)

    // Criar novo Tenant automaticamente
    const prefix = email.split('@')[0].replace(/[^a-z0-9]/g, '')
    const shortUuid = crypto.randomUUID().substring(0, 8)
    const tenantId = `t_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`
    const tenantName = `Workspace de ${email.split('@')[0]}`
    const tenantSlug = `${prefix}-${shortUuid}`

    await c.env.DB.prepare(
        'INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)'
    )
        .bind(tenantId, tenantName, tenantSlug)
        .run()

    // Inserir usuário
    const userId = crypto.randomUUID()
    await c.env.DB.prepare(
        'INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    )
        .bind(userId, tenantId, email, passwordHash, 'owner')
        .run()

    // EDA: emitir evento de registro em background
    emitAuthEvent(c, {
        tenant_id: tenantId,
        user_id: userId,
        event_type: 'AUTH_SUCCESS',
        ...meta,
        metadata: { action: 'register', email },
    })

    c.header('HX-Redirect', '/login')

    return c.html(successAlert('Conta criada com sucesso. Por favor, faça login.'))
})

export { registerRoute }
