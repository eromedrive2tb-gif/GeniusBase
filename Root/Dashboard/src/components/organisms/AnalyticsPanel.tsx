/** @jsxImportSource hono/jsx */

/**
 * Organism: AnalyticsPanel
 * Root/Dashboard/src/components/organisms/AnalyticsPanel.tsx
 *
 * Responsabilidade: Tela de boas-vindas exibindo os KPIs do motor de crescimento.
 */

const controllerScript = `
function analyticsController() {
    return {
        stats: {
            revenueOrders: 0,
            revenueTransactions: 0,
            totalCustomers: 0,
            totalOrders: 0
        },
        loading: true,

        // ── Currency Formatter ──────────────────────────────────
        currency(cents) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency', currency: 'BRL',
            }).format(cents / 100)
        },

        async init() {
            this.loading = true
            try {
                this.stats = await window.rpc.request('FETCH_ANALYTICS')
            } catch (e) {
                console.error('[AnalyticsPanel] FETCH_ANALYTICS failed:', e)
            } finally {
                this.loading = false
            }
        }
    }
}
`

export const AnalyticsPanel = () => {
    return (
        <div x-show="tab === 'analytics'" class="dash-panel" style="border: none; background: transparent; padding: 0;">
            <script dangerouslySetInnerHTML={{ __html: controllerScript }} />

            <div x-data="analyticsController()" x-init="init()">

                {/* Header / Welcome */}
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 2rem; font-weight: 800; color: var(--gb-text-bright); margin: 0 0 0.5rem 0; letter-spacing: -0.02em;">
                        Bem-vindo ao seu Motor de Crescimento.
                    </h2>
                    <p style="color: var(--gb-text-muted); margin: 0; font-size: 1rem;">
                        Acompanhe o desempenho do seu negócio em tempo real.
                    </p>
                </div>

                {/* Loading State */}
                <div x-show="loading" style="text-align:center; padding:3rem; color:var(--gb-text-muted); font-size:0.875rem;">
                    ⏳ Carregando métricas…
                </div>

                {/* Grid de KPIs */}
                <div x-show="!loading" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">

                    {/* 💰 Receita Total (Orders + Transactions) */}
                    <div style="background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.06)); border: 1px solid rgba(34,197,94,0.3); border-radius: 12px; padding: 1.5rem;">
                        <div style="font-size: 0.8rem; color: #86efac; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>💰</span> Receita Total
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #4ade80; font-variant-numeric: tabular-nums;" x-text="currency(stats.revenueOrders + stats.revenueTransactions)">R$ 0,00</div>
                        <div style="font-size: 0.8rem; color: #6ee7b7; margin-top: 0.3rem;">Soma de Pedidos + Avulsas</div>
                    </div>

                    {/* 📦 Vendas (E-commerce) */}
                    <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 1.5rem;">
                        <div style="font-size: 0.8rem; color: #c7d2fe; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>📦</span> Pedidos (E-commerce)
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #a5b4fc; font-variant-numeric: tabular-nums;" x-text="stats.totalOrders">0</div>
                        <div style="font-size: 0.8rem; color: #a5b4fc; margin-top: 0.3rem;" x-text="currency(stats.revenueOrders)">R$ 0,00</div>
                    </div>

                    {/* 💸 Transações Avulsas */}
                    <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.3); border-radius: 12px; padding: 1.5rem;">
                        <div style="font-size: 0.8rem; color: #e9d5ff; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>💸</span> Doações / Avulsas
                        </div>
                        {/* Fake some counts if we want, but we just show Revenue for now */}
                        <div style="font-size: 2rem; font-weight: 800; color: #d8b4fe; font-variant-numeric: tabular-nums;" x-text="currency(stats.revenueTransactions)">R$ 0,00</div>
                        <div style="font-size: 0.8rem; color: #e9d5ff; margin-top: 0.3rem;">Receita direta via Pix</div>
                    </div>

                    {/* 👥 Clientes no CRM */}
                    <div style="background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.3); border-radius: 12px; padding: 1.5rem;">
                        <div style="font-size: 0.8rem; color: #bae6fd; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>👥</span> Clientes (CRM)
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #7dd3fc; font-variant-numeric: tabular-nums;" x-text="stats.totalCustomers">0</div>
                        <div style="font-size: 0.8rem; color: #bae6fd; margin-top: 0.3rem;">Total na base (Ativos e Passivos)</div>
                    </div>

                </div>
            </div>
        </div>
    )
}
