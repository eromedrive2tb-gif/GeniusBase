/** @jsxImportSource hono/jsx */

/**
 * Organism: CoreApisPanel
 * Root/Dashboard/src/components/organisms/CoreApisPanel.tsx
 *
 * Responsabilidade: Renderizar puramente a aba 1 (APIs Principais) 
 * com o grid de cards dos serviços. Componente também renderiza
 * a chave de API (JWT Bearer) do Tenant com botão "Copiar".
 */

interface CoreApisPanelProps {
  token?: string
}

export const CoreApisPanel = ({ token }: CoreApisPanelProps) => {
  // Obfuscate the token for display (e.g. "eyJh...••••••")
  const displayToken = token && token.length > 20 
    ? `${token.substring(0, 8)}...••••••` 
    : 'Token indisponível'

  return (
    <div x-show="tab === 'core'" x-cloak="">
      <div class="dash-panel">
        <div class="dash-panel__header">
          <div>
            <h2 class="dash-panel__title">APIs Principais</h2>
            <p class="dash-panel__subtitle">Seus endpoints essenciais de backend, auto-escopados por tenant.</p>
          </div>
        </div>

        {/* ─── API Key Card ─────────────────────────── */}
        <div class="api-key-card" x-data={`{ copied: false, token: '${token || ''}' }`}>
          <div class="api-key-card__header">
            <span class="api-key-card__title">Sua Chave de API (JWT Bearer)</span>
            <span class="badge badge--active">Secreto</span>
          </div>
          <div class="api-key-card__body">
            <code class="api-key-card__token">{displayToken}</code>
            <button 
              class="btn-outline-cyan"
              x-on:click="navigator.clipboard.writeText(token); copied = true; setTimeout(() => copied = false, 2000)"
            >
              <span x-show="!copied">Copiar Token</span>
              <span x-show="copied" x-cloak="">Copiado! ✓</span>
            </button>
          </div>
        </div>
        <br />

        <div class="card-grid">
          {/* Auth Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Autenticação (End-Users)</span>
              <span class="neon-card__icon">🔐</span>
            </div>
            <div class="neon-card__endpoint">POST /api/v1/auth/register</div>
            <div class="neon-card__endpoint">POST /api/v1/auth/login</div>
            <p class="neon-card__desc">
              Registro e Login para os usuários finais dos seus projetos. O JWT gerado aqui <strong>NÃO</strong> possui permissões administrativas de tenant.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>

          {/* Customers Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Clientes (CRM)</span>
              <span class="neon-card__icon">👥</span>
            </div>
            <div class="neon-card__endpoint">GET /api/v1/customers</div>
            <div class="neon-card__endpoint">POST /api/v1/customers</div>
            <p class="neon-card__desc">
              Gerencie os clientes finais das suas aplicações. Payloads POST em JSON com <code>name</code> e <code>email</code>.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>

          {/* Products Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Produtos (Catálogo)</span>
              <span class="neon-card__icon">📦</span>
            </div>
            <div class="neon-card__endpoint">GET /api/v1/products</div>
            <div class="neon-card__endpoint">POST /api/v1/products</div>
            <p class="neon-card__desc">
              Catálogo ágil. Payloads POST em JSON aceitam <code>name</code>, <code>price</code> (centavos) e <code>stock</code>.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
