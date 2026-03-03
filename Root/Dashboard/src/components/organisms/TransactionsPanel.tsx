/** @jsxImportSource hono/jsx */

/**
 * Organism: TransactionsPanel
 * Root/Dashboard/src/components/organisms/TransactionsPanel.tsx
 *
 * Responsabilidade: Aba "Transações Avulsas" — exibe transações independentes
 * (PIX avulso, doações, etc). Escuta via WebSocket PUSH `TRANSACTION_COMPLETED`.
 */

import { StatusBadge } from '../atoms/StatusBadge'

// Script for Alpine controller — defined before x-data so Alpine can find it.
const controllerScript = `
function transactionsController() {
    return {
        transactions: [],
        loading: true,

        async init() {
            await this.fetchData();
            
            // Ouve eventos RPC broadcastados pelo Durable Object
            window.addEventListener('rpc_push', (e) => {
                const { event, payload } = e.detail;
                if (event === 'TRANSACTION_COMPLETED') {
                    // A payload enviada pelo webhook conterá:
                    // { transaction_id, provider_transaction_id, amount, provider, status, payer_name, payer_document }
                    const index = this.transactions.findIndex(t => t.id === payload.transaction_id);
                    if (index > -1) {
                        this.transactions[index].status = 'COMPLETED';
                        this.transactions[index].payer_name = payload.payer_name;
                        this.transactions[index].payer_document = payload.payer_document;
                    } else {
                        // Fallback: insere no topo
                        this.transactions.unshift({
                            id: payload.transaction_id,
                            provider: payload.provider,
                            amount: payload.amount,
                            status: 'COMPLETED',
                            payer_name: payload.payer_name,
                            payer_document: payload.payer_document,
                            created_at: new Date().toISOString()
                        });
                    }
                    window.dispatchEvent(new CustomEvent('toast', { detail: '💸 PIX Avulso Recebido de ' + (payload.payer_name || 'Alguém') + '!' }));
                }
            });
        },

        async fetchData() {
            this.loading = true;
            try {
                const records = await window.rpc.request('FETCH_TRANSACTIONS');
                this.transactions = records || [];
            } catch (err) {
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Erro ao carregar transações.', bubbles: true }));
            } finally {
                this.loading = false;
            }
        }
    };
}
`

export const TransactionsPanel = () => {
    return (
        <div x-show="tab === 'transactions'" x-cloak="">
            {/* Inject Alpine controller before the x-data element uses it */}
            <script dangerouslySetInnerHTML={{ __html: controllerScript }} />

            <div
                class="dash-panel"
                x-data="transactionsController()"
            >
                <div class="dash-panel__header">
                    <div>
                        <h2 class="dash-panel__title">Transações Avulsas (Standalone PIX)</h2>
                        <p class="dash-panel__subtitle">Visualização em tempo real de doações e cobranças diretas.</p>
                    </div>
                    <button class="btn-outline-cyan" {...{ '@click': 'fetchData()' }}>
                        <span x-show="!loading">🔄 Atualizar</span>
                        <span x-show="loading">⏳ Carregando...</span>
                    </button>
                </div>

                {/* ─── Transactions Table ─────────────────────────────── */}
                <div x-show="!loading && transactions.length > 0" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--gb-border);">
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;">Transação ID</th>
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;">Data / Hora</th>
                                <th style="padding:0.65rem 0.75rem; text-align:center; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Status</th>
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Nome</th>
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Documento</th>
                                <th style="padding:0.65rem 0.75rem; text-align:right; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="txn in transactions" x-key="txn.id">
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s;"
                                    {...{ '@mouseenter': "$el.style.background='rgba(255,255,255,0.02)'", '@mouseleave': "$el.style.background=''" }}
                                >
                                    <td style="padding:0.65rem 0.75rem;">
                                        <code style="font-size:0.72rem; color:var(--gb-cyan); background:rgba(6,182,212,0.08); padding:0.2rem 0.45rem; border-radius:4px; white-space:nowrap;" x-text="txn.id.substring(0, 16) + '...'"></code>
                                    </td>

                                    <td style="padding:0.65rem 0.75rem; color:var(--gb-text-muted); white-space:nowrap;"
                                        x-text="txn.created_at ? (!isNaN(new Date(txn.created_at).getTime()) ? new Date(txn.created_at).toLocaleString('pt-BR') : txn.created_at) : '—'"></td>

                                    <td style="padding:0.65rem 0.75rem; text-align:center;">
                                        <StatusBadge status="txn.status" isAlpine={true} />
                                    </td>

                                    <td style="padding:0.65rem 0.75rem; color:var(--gb-text-muted);">
                                        <span x-show="txn.customer_id" style="color: var(--gb-text-bright); font-weight: 500;" x-text="txn.customer_name || 'Cliente Vinculado'"></span>
                                        <span x-show="txn.customer_id" style="display: block; font-size: 0.65rem; color: var(--gb-cyan);" x-text="'CRM: ' + txn.customer_email"></span>

                                        <span x-show="!txn.customer_id && txn.payer_name" x-text="txn.payer_name"></span>
                                        <span x-show="!txn.customer_id && !txn.payer_name" style="color: var(--gb-muted); font-style: italic;">Aguardando...</span>
                                    </td>

                                    <td style="padding:0.65rem 0.75rem; color:var(--gb-text-muted); font-size: 0.75rem;">
                                        <span x-show="txn.payer_document" x-text="txn.payer_document"></span>
                                        <span x-show="!txn.payer_document" style="color: var(--gb-muted); font-style: italic;">—</span>
                                    </td>

                                    <td style="padding:0.65rem 0.75rem; text-align:right; font-weight:600; font-variant-numeric:tabular-nums;"
                                        {...{ ':style': "txn.status === 'COMPLETED' ? 'color:#4ade80;' : 'color:var(--gb-text-bright);'" }}>
                                        <span x-text="'R$ ' + (txn.amount / 100).toFixed(2)"></span>
                                        <span style="display: block; font-size: 0.7rem; color: var(--gb-muted); font-weight: 400;" x-text="'via ' + txn.provider"></span>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                {/* ─── Empty State ──────────────────────────────── */}
                <div x-show="!loading && transactions.length === 0" style="text-align:center; padding:3rem; color:var(--gb-text-muted);">
                    <div style="font-size:2.5rem; margin-bottom:0.5rem;">💸</div>
                    <div style="font-weight:600; color:var(--gb-text-bright); margin-bottom:0.25rem;">Nenhuma transação avulsa encontrada.</div>
                    <div style="font-size:0.82rem;">Use a API REST para gerar transações.</div>
                </div>
            </div>
        </div>
    )
}
