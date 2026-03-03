/** @jsxImportSource hono/jsx */

/**
 * Organism: CoreApisPanel
 * Root/Dashboard/src/components/organisms/CoreApisPanel.tsx
 *
 * Responsabilidade: Aba "APIs Principais" — grid de cards de endpoints + gerador
 * de Service API Key (role: service). NÃO exibe nem referencia o JWT de sessão
 * do admin, que vive exclusivamente no Cookie HttpOnly.
 */

export const CoreApisPanel = () => {
  return (
    <div x-show="tab === 'core'" x-cloak="">
      <div class="dash-panel">
        <div class="dash-panel__header">
          <div>
            <h2 class="dash-panel__title">APIs Principais</h2>
            <p class="dash-panel__subtitle">Seus endpoints essenciais de backend, auto-escopados por tenant.</p>
          </div>
        </div>

        {/* ─── API Keys Generator ───────────────── */}
        <div class="api-key-card api-key-card--service">
          <div class="api-key-card__header">
            <span class="api-key-card__title">🔑 Gerenciamento de Chaves de API</span>
            <span class="badge" style="background: rgba(180,100,255,0.15); color: #b464ff; border-color: rgba(180,100,255,0.3);">
              multi-keys
            </span>
          </div>
          <p class="api-key-card__desc" style="padding: 0 1rem 0.75rem; color: var(--gb-muted); font-size: 0.8rem; margin: 0;">
            Gera instantaneamente suas chaves de integração para consumir o BaaS (<code>/api/v1/*</code>). Cada clique revoga chaves anteriores e gera simultaneamente a <strong>Public Anon Key</strong> (leitura limitadas para o Frontend) e a <strong>Service Role Key</strong> (acesso ilimitado para o Backend).
          </p>
          <div class="api-key-card__body">
            <button
              class="btn-outline-cyan"
              hx-post="/api/internal/apikeys"
              hx-target="#api-key-result"
              hx-swap="innerHTML"
              hx-indicator="#apikey-spinner"
            >
              ⚡ Gerar Novas Chaves
            </button>
            <span id="apikey-spinner" class="htmx-indicator" style="margin-left: 0.5rem; opacity: 0; transition: opacity 0.2s;">
              Criando túneis...
            </span>
          </div>
          {/* HTMX inject target — dual tokens displayed here after generation */}
          <div id="api-key-result" style="padding: 0 1rem 1rem;"></div>
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
              Gerencie os clientes finais das suas aplicações. Payloads POST em JSON com <code>name</code>, <code>email</code> e propriedades flexíveis `metadata`.
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
              Catálogo ágil. Payloads POST em JSON aceitam <code>name</code>, <code>price</code> (centavos), <code>stock</code> e propriedades flexíveis `metadata`.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>

          {/* Realtime Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Realtime (WebSocket Público)</span>
              <span class="neon-card__icon">📡</span>
            </div>
            <div class="neon-card__endpoint">GET /api/v1/realtime</div>
            <p class="neon-card__desc">
              Túnel de eventos públicos via WebSocket. Conecte-se passando a Service Key, a Anon Key ou End-User JWT como query param.
              Receba broadcasts em tempo real do BaaS direto no cliente.
            </p>
            <pre style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:0.6rem 0.75rem; font-size:0.72rem; color:#94a3b8; margin:0.5rem 0; overflow-x:auto;">{`// SDK
gb.channel('meu-canal')
  .on('PRODUCT_CREATED', handler)
  .subscribe()

// WebSocket nativo
new WebSocket('wss://url/api/v1/realtime?token=<KEY>')`}</pre>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>

          {/* Events / Igor Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Eventos Customizados (Telemetria)</span>
              <span class="neon-card__icon">⚡</span>
            </div>
            <div class="neon-card__endpoint">POST /api/v1/events</div>
            <p class="neon-card__desc">
              Dispare eventos arbitrários do seu app (ex: <code>"Compra PIX"</code>, <code>"Botão Clicado"</code>).
              O GeniusBase persiste no D1, registra no log e notifica o Dashboard em <strong>tempo real</strong> via WebSocket.
            </p>
            <pre style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:0.6rem 0.75rem; font-size:0.72rem; color:#94a3b8; margin:0.5rem 0; overflow-x:auto;">{`POST /api/v1/events
Authorization: Bearer <SUA_SERVICE_KEY>

{
  "name": "Compra PIX",
  "payload": { "valor": 150.00, "metodo": "pix" }
}`}</pre>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo
            </span>
          </div>

          {/* Transactions (Standalone) Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">PIX Avulso / Doações</span>
              <span class="neon-card__icon">💸</span>
            </div>
            <div class="neon-card__endpoint">POST /api/v1/transactions</div>
            <p class="neon-card__desc">
              Crie cobranças diretas e doações. Suporta Guest Checkout (compras sem login) usando a <strong>Public Anon Key</strong>. Rate Limiter ativo para proteção Anti-Spam.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo (Fase 15)
            </span>
          </div>

          {/* Storage Card */}
          <div class="neon-card">
            <div class="neon-card__header">
              <span class="neon-card__title">Storage Público (CDN R2)</span>
              <span class="neon-card__icon">📁</span>
            </div>
            <div class="neon-card__endpoint">POST /api/v1/storage/upload</div>
            <div class="neon-card__endpoint">GET /api/v1/storage/public/:id</div>
            <p class="neon-card__desc">
              Upload e hospedagem isolada de mídias (Imagens, PDFs). O arquivo é fisicamente armazenado no Cloudflare R2 e distribuído através de uma CDN global.
            </p>
            <span class="badge badge--active">
              <span class="badge--dot"></span> Ativo (Fase 17)
            </span>
          </div>
        </div>

        {/* Payments / Checkouts Card */}
        <div class="neon-card" style="margin-top: 1.5rem;">
          <div class="neon-card__header">
            <span class="neon-card__title">Pagamentos (E-commerce e Avulso)</span>
            <span class="neon-card__icon">💳</span>
          </div>
          <div class="neon-card__endpoint">POST /api/v1/orders</div>
          <div class="neon-card__endpoint">POST /api/v1/transactions</div>
          <p class="neon-card__desc">
            Crie Pedidos completos ou Transações Avulsas. <strong>Guest Checkout habilitado</strong>. Metadados dinâmicos e flexíveis permitidos (`metadata`).
            A Gateway externa envia o webhook de confirmação para o BaaS, mapeia e-mails, abastece passivamente o CRM e dispara <code>ORDER_PAID</code>.
          </p>
          <pre style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:0.6rem 0.75rem; font-size:0.72rem; color:#94a3b8; margin:0.5rem 0; overflow-x:auto;">{`POST /api/v1/orders
Authorization: Bearer <SERVICE_KEY>

{ "provider": "openpix", "items": [{ "product_id": "prod_123", "quantity": 1 }] }`}</pre>
          <span class="badge badge--active">
            <span class="badge--dot"></span> Ativo
          </span>
        </div>
      </div>
    </div>
  )
}
