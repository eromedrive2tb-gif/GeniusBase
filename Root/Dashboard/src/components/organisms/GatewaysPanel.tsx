/** @jsxImportSource hono/jsx */

/**
 * Organism: GatewaysPanel
 * Root/Dashboard/src/components/organisms/GatewaysPanel.tsx
 *
 * Painel de configuração de credenciais de gateways de pagamento por Tenant.
 * Gerencia dados EXCLUSIVAMENTE via WebSocket (RPC) — zero HTTP direto.
 *
 * IMPORTANTE: a função gatewaysController() é definida num <script> ANTES do
 * elemento x-data para garantir que esteja disponível quando Alpine inicializa.
 *
 * RPC Commands:
 *   FETCH_GATEWAYS → lista gateways (nunca retorna credenciais raw)
 *   SAVE_GATEWAY   → salva/atualiza credencial via UPSERT
 *
 * Auth para Woovi: Authorization: <APP_ID>  (sem prefixo "Bearer")
 */

// The controller script is a raw string — single quotes throughout to avoid
// escaping issues. It is injected BEFORE the x-data div so Alpine finds it.
const CONTROLLER_SCRIPT = `
function gatewaysController() {
    return {
        openpixAppId: '',
        openpixSandbox: false,
        openpixConfigured: false,
        saving: false,
        feedback: '',
        feedbackOk: false,

        async init() {
            try {
                var result = await window.rpc.request('FETCH_GATEWAYS');
                var gws = Array.isArray(result) ? result : [];
                this.openpixConfigured = gws.some(function(g) {
                    return g.provider === 'openpix' && g.is_active;
                });
            } catch (e) {
                console.warn('[GatewaysPanel] FETCH_GATEWAYS failed:', e);
            }
        },

        async saveOpenpix() {
            var appId = this.openpixAppId.trim();
            if (!appId) return;
            this.saving = true;
            this.feedback = '';
            try {
                await window.rpc.request('SAVE_GATEWAY', {
                    provider: 'openpix',
                    credentials: { appId: appId, sandbox: this.openpixSandbox }
                });
                this.openpixConfigured = true;
                this.openpixAppId = '';
                this.feedbackOk = true;
                var envLabel = this.openpixSandbox ? 'Sandbox' : 'Producao';
                this.feedback = '✅ App ID (' + envLabel + ') salvo! Cobranças PIX ativas.';
            } catch (e) {
                this.feedbackOk = false;
                this.feedback = '❌ Erro: ' + (e && e.message ? e.message : String(e));
            } finally {
                this.saving = false;
                setTimeout(function() { this.feedback = ''; }.bind(this), 5000);
            }
        }
    };
}
`

export const GatewaysPanel = () => {
    return (
        <div x-show="tab === 'gateways'" x-cloak="">
            {/* Controller must be defined before x-data evaluates it */}
            <script dangerouslySetInnerHTML={{ __html: CONTROLLER_SCRIPT }}></script>

            <div class="dash-panel">
                <div class="dash-panel__header">
                    <div>
                        <h2 class="dash-panel__title">Gateways de Pagamento</h2>
                        <p class="dash-panel__subtitle">Configure as credenciais da sua gateway. Cada Tenant usa as suas próprias chaves.</p>
                    </div>
                </div>

                <div
                    {...{
                        'x-data': 'gatewaysController()',
                        'x-init': 'init()',
                    }}
                >
                    {/* ─── Status das Integrações ─────────────── */}
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.8rem; color: var(--gb-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                            Status das Integrações
                        </h3>
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 0.85rem;">🏦 OpenPix / Woovi</span>
                                <span
                                    style="font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 20px;"
                                    {...{
                                        ':style': "openpixConfigured ? 'background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3)' : 'background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3)'",
                                        'x-text': "openpixConfigured ? '✅ Configurado' : '⚠️ Não configurado'",
                                    }}
                                ></span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Formulário OpenPix / Woovi ─────────── */}
                    <div class="api-key-card api-key-card--service" style="max-width: 600px;">
                        <div class="api-key-card__header">
                            <span class="api-key-card__title">🏦 OpenPix / Woovi — App ID</span>
                            <span class="badge" style="background:rgba(6,182,212,0.1);color:var(--gb-cyan);border-color:rgba(6,182,212,0.2);font-size:0.7rem;padding:0.1rem 0.5rem;">
                                Sandbox / Produção
                            </span>
                        </div>

                        <div class="api-key-card__body" style="flex-direction:column;align-items:flex-start;gap:0.75rem;padding:0.5rem 1rem 1rem;">
                            <p style="font-size:0.8rem;color:var(--gb-muted);margin:0;">
                                Cole o <strong>App ID</strong> gerado em{' '}
                                <a href="https://app.woovi.com" target="_blank" style="color:var(--gb-cyan);">app.woovi.com</a>{' '}
                                → API/Plugins → Novo App.
                            </p>

                            <div style="display:flex;gap:0.5rem;width:100%;flex-wrap:wrap;">
                                <input
                                    type="password"
                                    id="openpix-app-id-input"
                                    placeholder="Cole seu App ID da Woovi aqui..."
                                    style="flex:1;min-width:220px;background:#0a0a0f;border:1px solid #1e293b;border-radius:4px;padding:0.5rem 0.75rem;color:#e2e8f0;font-size:0.82rem;font-family:monospace;"
                                    {...{
                                        'x-model': 'openpixAppId',
                                        ':disabled': 'saving',
                                    }}
                                />
                                <button
                                    id="btn-save-gateway"
                                    class="btn-outline-cyan"
                                    {...{
                                        '@click': 'saveOpenpix()',
                                        ':disabled': 'saving || !openpixAppId',
                                    }}
                                >
                                    <span {...{ 'x-text': "saving ? 'Salvando...' : '💾 Salvar'" }}></span>
                                </button>
                            </div>

                            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--gb-muted);cursor:pointer;">
                                <input
                                    type="checkbox"
                                    id="openpix-sandbox-toggle"
                                    style="accent-color:#06b6d4;"
                                    {...{ 'x-model': 'openpixSandbox' }}
                                />
                                Usar ambiente <strong style="color:#fbbf24;">Sandbox</strong> (testes) — desmarque para Produção
                            </label>

                            {/* Feedback banner */}
                            <div
                                style="font-size:0.8rem;padding:0.4rem 0.75rem;border-radius:4px;"
                                {...{
                                    'x-show': 'feedback',
                                    'x-text': 'feedback',
                                    ':style': "feedbackOk ? 'background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3);' : 'background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3);'",
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
