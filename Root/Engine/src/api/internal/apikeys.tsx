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

    const serviceJti = crypto.randomUUID()
    const anonJti = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // Sign with ENDUSER_JWT_SECRET
    const serviceToken = await sign(
        {
            sub: userId,
            tid: tenantId,
            jti: serviceJti,
            role: 'service',
            iat: now,
            exp: now + SERVICE_TOKEN_TTL,
        },
        secret,
        'HS256'
    )

    // Public Anon Key has a super long TTL (10 years) but can be revoked
    const ANON_TOKEN_TTL = 3650 * 24 * 60 * 60
    const anonToken = await sign(
        {
            sub: userId,
            tid: tenantId,
            jti: anonJti,
            role: 'anon',
            iat: now,
            exp: now + ANON_TOKEN_TTL,
        },
        secret,
        'HS256'
    )

    // Persist JTIs in KV
    await c.env.KV_CACHE.put(
        `session:${serviceJti}`,
        JSON.stringify({
            user_id: userId,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            type: 'service',
        }),
        { expirationTtl: SERVICE_TOKEN_TTL }
    )

    await c.env.KV_CACHE.put(
        `anon_session:${anonJti}`,
        JSON.stringify({
            user_id: userId,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            type: 'anon',
        }),
        { expirationTtl: ANON_TOKEN_TTL }
    )

    // EDA: emit audit event
    const meta = extractRequestMeta(c)
    emitAuthEvent(c, {
        tenant_id: tenantId,
        user_id: userId,
        event_type: 'API_KEY_GENERATED',
        ...meta,
        metadata: { service_jti: serviceJti, anon_jti: anonJti, role: 'multi' },
    })

    // HTML fragment injected into #api-key-result by HTMX
    return c.html(
        <div class="api-key-result" style="display: flex; flex-direction: column; gap: 1rem;">
            {/* 🔑 Public Anon Key */}
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 1rem;">
                <div class="api-key-result__header" style="margin-bottom: 0.5rem;">
                    <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">
                        <span class="badge--dot" style="background: #10b981;"></span>&nbsp;Public Anon Key
                    </span>
                    <span class="api-key-result__ttl" style="font-size: 0.75rem; color: #10b981;">Frontend (Client-Side)</span>
                </div>
                <p style="font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.75rem;">
                    <strong>Permissão Limitada:</strong> Use esta chave livremente nos seus aplicativos web e mobile em produção. Ela permite apenas leitura pública (GET) e Login/Eventos (POST).
                </p>
                <div class="api-key-card__body" {...{ 'x-data': `{ copied: false, key: '${anonToken}' }` }}>
                    <code class="api-key-card__token api-key-card__token--full">{anonToken}</code>
                    <button
                        class="btn-outline-cyan"
                        {...{
                            'x-on:click': "navigator.clipboard.writeText(key); copied = true; setTimeout(() => copied = false, 2000)"
                        }}
                    >
                        <span {...{ 'x-show': '!copied' }}>Copiar Anon</span>
                        <span {...{ 'x-show': 'copied', 'x-cloak': '' }}>Copiado! ✓</span>
                    </button>
                </div>
            </div>

            {/* 🚨 Service Role Key */}
            <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 1rem;">
                <div class="api-key-result__header" style="margin-bottom: 0.5rem;">
                    <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">
                        <span class="badge--dot" style="background: #ef4444;"></span>&nbsp;Service Role Key
                    </span>
                    <span class="api-key-result__ttl" style="font-size: 0.75rem; color: #ef4444;">Backend (Server-Side)</span>
                </div>
                <p style="font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.75rem;">
                    ⚠️ <strong>Poder Total:</strong> Esta chave ignora as regras de segurança (RLS). Nunca a exponha no frontend. Use apenas nos seus servidores ou Workers. Válida por 365 dias.
                </p>
                <div class="api-key-card__body" {...{ 'x-data': `{ copied: false, key: '${serviceToken}' }` }}>
                    <code class="api-key-card__token api-key-card__token--full">{serviceToken}</code>
                    <button
                        class="btn-outline-cyan"
                        {...{
                            'x-on:click': "navigator.clipboard.writeText(key); copied = true; setTimeout(() => copied = false, 2000)"
                        }}
                    >
                        <span {...{ 'x-show': '!copied' }}>Copiar Service</span>
                        <span {...{ 'x-show': 'copied', 'x-cloak': '' }}>Copiado! ✓</span>
                    </button>
                </div>
            </div>
        </div>
    )
})

export { apiKeysRoute }
