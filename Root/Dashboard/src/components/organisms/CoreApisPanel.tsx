/** @jsxImportSource hono/jsx */

/**
 * Organism: CoreApisPanel
 * Root/Dashboard/src/components/organisms/CoreApisPanel.tsx
 *
 * Responsabilidade: Renderizar puramente a aba 1 (APIs Principais) 
 * com o grid de cards dos serviços.
 */

export const CoreApisPanel = () => {
    return (
        <div x-show="tab === 'core'" x-cloak="">
            <div class="dash-panel">
                <h2 class="panel-title">APIs Principais</h2>
                <p class="panel-subtitle">Seus endpoints essenciais de backend, auto-escopados por tenant.</p>

                <div class="card-grid">
                    {/* Auth Card */}
                    <div class="neon-card">
                        <div class="neon-card__header">
                            <span class="neon-card__title">Autenticação</span>
                            <span class="neon-card__icon">🔐</span>
                        </div>
                        <div class="neon-card__endpoint">/api/auth/*</div>
                        <p class="neon-card__desc">
                            Registro, Login (JWT HS256) e Logout com tenants auto-provisionados e sessões no KV.
                        </p>
                        <span class="badge badge--active">
                            <span class="badge--dot"></span> Ativo
                        </span>
                    </div>

                    {/* Customers Card */}
                    <div class="neon-card">
                        <div class="neon-card__header">
                            <span class="neon-card__title">Clientes</span>
                            <span class="neon-card__icon">👥</span>
                        </div>
                        <div class="neon-card__endpoint">/api/v1/customers</div>
                        <p class="neon-card__desc">
                            CRUD para registros de clientes, isolados por tenant via consultas relacionais no D1.
                        </p>
                        <span class="badge badge--soon">
                            <span class="badge--dot"></span> Em Breve
                        </span>
                    </div>

                    {/* Products Card */}
                    <div class="neon-card">
                        <div class="neon-card__header">
                            <span class="neon-card__title">Produtos</span>
                            <span class="neon-card__icon">📦</span>
                        </div>
                        <div class="neon-card__endpoint">/api/v1/products</div>
                        <p class="neon-card__desc">
                            Gerenciamento de catálogo de produtos com preços, inventário e upload de imagens no R2.
                        </p>
                        <span class="badge badge--soon">
                            <span class="badge--dot"></span> Em Breve
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
