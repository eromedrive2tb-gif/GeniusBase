/** @jsxImportSource hono/jsx */

/**
 * Internal Service API Key Generator
 * Root/Engine/src/api/internal/apikeys.tsx
 *
 * Responsabilidade única: Gerar um JWT de serviço de longa duração (role: 'service')
 * assinado com ENDUSER_JWT_SECRET, para uso nas chamadas ao BaaS (/api/v1/*).
 * Protegido por adminAuth. Emite EDA event 'API_KEY_GENERATED' em background.
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { adminAuth } from '../../middlewares/adminAuth'
import { sign } from 'hono/jwt'
import { emitAuthEvent, extractRequestMeta } from '../../events/authEvents'

// Service tokens are long-lived: 1 year
const SERVICE_TOKEN_TTL = 365 * 24 * 60 * 60

const apiKeysRoute = createAuthRouter()

apiKeysRoute.use('*', adminAuth)

/**
 * POST /api/internal/apikeys
 * Generates a new Service API Key (role: 'service') signed with ENDUSER_JWT_SECRET.
 * Returns an HTML fragment for HTMX injection into #api-key-result.
 */
apiKeysRoute.post('/', async (c) => {
    const tenantId = c.get('tenantId') as string
    const userId = c.get('userId') as string

    const secret = c.env.ENDUSER_JWT_SECRET
    if (!secret) {
        console.error('[apikeys] ENDUSER_JWT_SECRET not configured')
        return c.html(
            <div class="alert alert-error" role="alert">
                Erro de configuração: ENDUSER_JWT_SECRET não definido.
            </div>,
            500
        )
    }

    const jti = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // Sign with ENDUSER_JWT_SECRET → token is directly usable by apiKeyAuth
    const serviceToken = await sign(
        {
            sub: userId,
            tid: tenantId,
            jti,
            role: 'service',
            iat: now,
            exp: now + SERVICE_TOKEN_TTL,
        },
        secret,
        'HS256'
    )

    // Persist JTI in KV so apiKeyAuth can validate the session — TTL = 1 year
    await c.env.KV_CACHE.put(
        `session:${jti}`,
        JSON.stringify({
            user_id: userId,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            type: 'service',
        }),
        { expirationTtl: SERVICE_TOKEN_TTL }
    )

    // EDA: emit audit event non-blocking via waitUntil
    const meta = extractRequestMeta(c)
    emitAuthEvent(c, {
        tenant_id: tenantId,
        user_id: userId,
        event_type: 'API_KEY_GENERATED',
        ...meta,
        metadata: { jti, role: 'service', ttl_days: 365 },
    })

    // HTML fragment injected into #api-key-result by HTMX
    return c.html(
        <div class="api-key-result">
            <div class="api-key-result__header">
                <span class="badge badge--active">
                    <span class="badge--dot"></span>&nbsp;Chave Gerada
                </span>
                <span class="api-key-result__ttl">Válida por 365 dias</span>
            </div>
            <p class="api-key-result__warning">
                ⚠️ <strong>Copie agora.</strong> Esta chave não poderá ser exibida novamente.
            </p>
            <div
                class="api-key-card__body"
                {...{ 'x-data': `{ copied: false, key: '${serviceToken}' }` }}
            >
                <code class="api-key-card__token api-key-card__token--full">
                    {serviceToken}
                </code>
                <button
                    class="btn-outline-cyan"
                    {...{
                        'x-on:click': "navigator.clipboard.writeText(key); copied = true; setTimeout(() => copied = false, 2000)"
                    }}
                >
                    <span {...{ 'x-show': '!copied' }}>Copiar Chave</span>
                    <span {...{ 'x-show': 'copied', 'x-cloak': '' }}>Copiado! ✓</span>
                </button>
            </div>
        </div>
    )
})

export { apiKeysRoute }
