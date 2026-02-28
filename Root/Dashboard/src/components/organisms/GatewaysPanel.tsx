/** @jsxImportSource hono/jsx */

/**
 * Organism: GatewaysPanel
 * Root/Dashboard/src/components/organisms/GatewaysPanel.tsx
 *
 * Responsabilidade: Renderizar puramente a aba 2 (Gateways de Pagamento)
 * com o painel unificado configurador de gateways.
 */

export const GatewaysPanel = () => {
    return (
        <div x-show="tab === 'gateways'" x-cloak="">
            <div class="dash-panel">
                <div class="dash-panel__header">
                    <div>
                        <h2 class="dash-panel__title">Gateways de Pagamento</h2>
                        <p class="dash-panel__subtitle">Agregador Multi-Gateway Unificado — um endpoint, qualquer provedor.</p>
                    </div>
                </div>

                <div class="gw-list">
                    {/* Stripe */}
                    <div class="gw-row">
                        <div>
                            <div class="gw-row__name">Stripe</div>
                            <div class="gw-row__sub">Cartão de Crédito, Apple Pay, Google Pay</div>
                        </div>
                        <button class="btn-outline-cyan">Configurar Credenciais</button>
                    </div>

                    {/* Mercado Pago */}
                    <div class="gw-row">
                        <div>
                            <div class="gw-row__name">Mercado Pago</div>
                            <div class="gw-row__sub">PIX, Boleto, Cartão de Crédito</div>
                        </div>
                        <button class="btn-outline-cyan">Configurar Credenciais</button>
                    </div>

                    {/* PayPal */}
                    <div class="gw-row">
                        <div>
                            <div class="gw-row__name">PayPal</div>
                            <div class="gw-row__sub">Saldo PayPal, Cartão de Crédito</div>
                        </div>
                        <button class="btn-outline-cyan">Configurar Credenciais</button>
                    </div>
                </div>

                {/* Unified Endpoint */}
                <div class="endpoint-highlight">
                    <span class="endpoint-highlight__label">Endpoint Unificado</span>
                    <span class="endpoint-highlight__url">/api/v1/payments/charge</span>
                </div>
            </div>
        </div>
    )
}
