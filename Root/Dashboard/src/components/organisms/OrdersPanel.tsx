/** @jsxImportSource hono/jsx */

/**
 * Organism: OrdersPanel
 * Root/Dashboard/src/components/organisms/OrdersPanel.tsx
 *
 * Responsabilidade: Exibir pedidos do Tenant em tempo real.
 * - Carrega pedidos iniciais via RPC (FETCH_ORDERS) no init().
 * - Escuta ORDER_PAID via rpc_push para atualizar status e métricas live.
 * - Mostra cards de receita total, pendentes e vendas confirmadas.
 * - Tabela com badges de status coloridas e formatação de moeda.
 */

// Script for Alpine controller — defined before x-data so Alpine can find it.
const controllerScript = `
function ordersController() {
    return {
        orders: [],
        loading: true,
        toastMsg: '',
        toastVisible: false,

        // ── Computed Metrics ────────────────────────────────────
        get totalRevenue() {
            return this.orders
                .filter(o => o.status === 'PAID')
                .reduce((sum, o) => sum + (o.total_amount || 0), 0)
        },
        get totalPaid() {
            return this.orders.filter(o => o.status === 'PAID').length
        },
        get totalPending() {
            return this.orders.filter(o => o.status === 'PENDING').length
        },

        // ── Currency Formatter ──────────────────────────────────
        currency(cents) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency', currency: 'BRL',
            }).format(cents / 100)
        },

        // ── Date Formatter ──────────────────────────────────────
        dateTime(raw) {
            if (!raw) return '–'
            try {
                const d = new Date(raw)
                return isNaN(d) ? raw : d.toLocaleString('pt-BR')
            } catch { return raw }
        },

        // ── Order ID Truncation ─────────────────────────────────
        shortId(id) {
            if (!id) return '–'
            return id.length > 16 ? id.slice(0, 8) + '…' + id.slice(-6) : id
        },

        // ── Init ────────────────────────────────────────────────
        async init() {
            this.loading = true
            try {
                const result = await window.rpc.request('FETCH_ORDERS')
                this.orders = Array.isArray(result) ? result : []
            } catch (e) {
                console.error('[OrdersPanel] FETCH_ORDERS failed:', e)
                this.orders = []
            }
            this.loading = false

            // ── Listen for real-time ORDER_PAID events ──────────
            window.addEventListener('rpc_push', (e) => {
                const { event, payload } = e.detail || {}
                if (event !== 'ORDER_PAID') return

                const idx = this.orders.findIndex(o => o.id === payload.order_id)
                if (idx > -1) {
                    // Update existing row status to PAID
                    this.orders[idx] = {
                        ...this.orders[idx],
                        status: 'PAID',
                        total_amount: payload.total_amount ?? this.orders[idx].total_amount,
                        updated_at: payload.updated_at,
                    }
                } else {
                    // New order that wasn't in the initial fetch — prepend
                    this.orders.unshift({
                        id:            payload.order_id,
                        status:        'PAID',
                        total_amount:  payload.total_amount,
                        payment_method: payload.provider ?? 'PIX',
                        provider:      payload.provider ?? 'openpix',
                        item_count:    Array.isArray(payload.items) ? payload.items.length : 1,
                        created_at:    payload.updated_at,
                        updated_at:    payload.updated_at,
                    })
                }

                // Toast notification
                this.toastMsg = '💰 Nova Venda: ' + this.currency(payload.total_amount ?? 0)
                this.toastVisible = true
                setTimeout(() => { this.toastVisible = false }, 4000)
            })
        },
    }
}
`

export const OrdersPanel = () => {
    return (
        <div x-show="tab === 'orders'" x-cloak="" class="dash-panel">

            {/* Inject Alpine controller before the x-data element uses it */}
            <script dangerouslySetInnerHTML={{ __html: controllerScript }} />

            <div x-data="ordersController()" x-init="init()">

                {/* ─── Header ─────────────────────────────────── */}
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.75rem;">
                    <div>
                        <h2 class="panel-title" style="margin:0;">📦 Pedidos / Vendas</h2>
                        <p class="panel-subtitle" style="margin:0.25rem 0 0;">Histórico de compras e atualização em tempo real via WebSocket.</p>
                    </div>
                    <button
                        style="background: rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:#a5b4fc; border-radius:6px; padding:0.45rem 1rem; font-size:0.8rem; cursor:pointer;"
                        {...{ '@click': 'loading=true; init()' }}
                    >
                        ↺ Atualizar
                    </button>
                </div>

                {/* ─── Toast Notification ─────────────────────── */}
                <div
                    {...{
                        'x-show': 'toastVisible',
                        'x-transition:enter': 'transition ease-out duration-300',
                        'x-transition:enter-start': 'opacity-0 transform translate-y-2',
                        'x-transition:enter-end': 'opacity-100 transform translate-y-0',
                        'x-transition:leave': 'transition ease-in duration-200',
                        'x-transition:leave-start': 'opacity-100',
                        'x-transition:leave-end': 'opacity-0',
                    }}
                    style="position:fixed; top:1.25rem; right:1.25rem; z-index:9999; background:linear-gradient(135deg,#166534,#15803d); border:1px solid #22c55e; border-radius:10px; padding:0.75rem 1.25rem; color:#dcfce7; font-weight:600; font-size:0.875rem; box-shadow:0 8px 24px rgba(0,0,0,0.4);"
                >
                    <span x-text="toastMsg"></span>
                </div>

                {/* ─── Metric Cards ────────────────────────────── */}
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1.75rem;">

                    {/* Revenue Card */}
                    <div style="background:linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.06)); border:1px solid rgba(34,197,94,0.3); border-radius:10px; padding:1.1rem 1.25rem;">
                        <div style="font-size:0.72rem; color:#86efac; text-transform:uppercase; letter-spacing:.05em; font-weight:600; margin-bottom:0.3rem;">💰 Receita Total</div>
                        <div style="font-size:1.6rem; font-weight:800; color:#4ade80; font-variant-numeric:tabular-nums;" x-text="currency(totalRevenue)">R$ 0,00</div>
                        <div style="font-size:0.72rem; color:#6ee7b7; margin-top:0.2rem;" x-text="totalPaid + ' pedido(s) confirmado(s)'">0 confirmados</div>
                    </div>

                    {/* Pending Card */}
                    <div style="background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.25); border-radius:10px; padding:1.1rem 1.25rem;">
                        <div style="font-size:0.72rem; color:#fde68a; text-transform:uppercase; letter-spacing:.05em; font-weight:600; margin-bottom:0.3rem;">⏳ Aguardando</div>
                        <div style="font-size:1.6rem; font-weight:800; color:#fbbf24; font-variant-numeric:tabular-nums;" x-text="totalPending">0</div>
                        <div style="font-size:0.72rem; color:#fde68a; margin-top:0.2rem;">pedidos pendentes de pagamento</div>
                    </div>

                    {/* Total Orders Card */}
                    <div style="background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.25); border-radius:10px; padding:1.1rem 1.25rem;">
                        <div style="font-size:0.72rem; color:#c7d2fe; text-transform:uppercase; letter-spacing:.05em; font-weight:600; margin-bottom:0.3rem;">📦 Total de Pedidos</div>
                        <div style="font-size:1.6rem; font-weight:800; color:#a5b4fc; font-variant-numeric:tabular-nums;" x-text="orders.length">0</div>
                        <div style="font-size:0.72rem; color:#c7d2fe; margin-top:0.2rem;">nos últimos 50 registros</div>
                    </div>
                </div>

                {/* ─── Loading State ────────────────────────────── */}
                <div x-show="loading" style="text-align:center; padding:3rem; color:var(--gb-text-muted); font-size:0.875rem;">
                    ⏳ Carregando pedidos…
                </div>

                {/* ─── Empty State ──────────────────────────────── */}
                <div x-show="!loading && orders.length === 0" style="text-align:center; padding:3rem; color:var(--gb-text-muted);">
                    <div style="font-size:2.5rem; margin-bottom:0.5rem;">🛒</div>
                    <div style="font-weight:600; color:var(--gb-text-bright); margin-bottom:0.25rem;">Nenhum pedido ainda</div>
                    <div style="font-size:0.82rem;">Use o Playground para criar o primeiro checkout.</div>
                </div>

                {/* ─── Orders Table ─────────────────────────────── */}
                <div x-show="!loading && orders.length > 0" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--gb-border);">
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;">Pedido / Cliente</th>
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;">Data / Hora</th>
                                <th style="padding:0.65rem 0.75rem; text-align:center; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Status</th>
                                <th style="padding:0.65rem 0.75rem; text-align:center; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Itens</th>
                                <th style="padding:0.65rem 0.75rem; text-align:center; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Extras</th>
                                <th style="padding:0.65rem 0.75rem; text-align:left; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Método</th>
                                <th style="padding:0.65rem 0.75rem; text-align:right; color:var(--gb-text-muted); font-weight:500; font-size:0.72rem; text-transform:uppercase; letter-spacing:.04em;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="order in orders" {...{ ':key': 'order.id' }}>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s;"
                                    {...{ '@mouseenter': "$el.style.background='rgba(255,255,255,0.02)'", '@mouseleave': "$el.style.background=''" }}
                                >
                                    {/* Order ID & Customer */}
                                    <td style="padding:0.65rem 0.75rem;">
                                        <code style="font-size:0.72rem; color:var(--gb-cyan); background:rgba(6,182,212,0.08); padding:0.2rem 0.45rem; border-radius:4px; white-space:nowrap; display:inline-block; margin-bottom:0.15rem;"
                                            x-text="shortId(order.id)"></code>

                                        <div x-show="order.customer_id" style="font-size: 0.75rem; color: var(--gb-text-bright); margin-top: 0.25rem;" x-text="order.customer_name || 'Cliente Sem Nome'"></div>
                                        <div x-show="order.customer_id" style="font-size: 0.65rem; color: var(--gb-cyan);" x-text="order.customer_email"></div>

                                        <div x-show="!order.customer_id" style="font-size: 0.7rem; color: var(--gb-muted); font-style: italic; margin-top: 0.25rem;">Cliente Visitante</div>
                                    </td>

                                    {/* Date */}
                                    <td style="padding:0.65rem 0.75rem; color:var(--gb-text-muted); white-space:nowrap;"
                                        x-text="dateTime(order.created_at)"></td>

                                    {/* Status Badge */}
                                    <td style="padding:0.65rem 0.75rem; text-align:center;">
                                        <span
                                            x-text="order.status"
                                            {...{
                                                ':style': `order.status === 'PAID'
                                                    ? 'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);'
                                                    : order.status === 'CANCELED'
                                                        ? 'background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25);'
                                                        : 'background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);'`
                                            }}
                                            style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:0.2rem 0.55rem; border-radius:20px; display:inline-block; transition:all 0.4s;"
                                        ></span>
                                    </td>

                                    {/* Item Count */}
                                    <td style="padding:0.65rem 0.75rem; text-align:center; color:var(--gb-text-muted);"
                                        x-text="(order.item_count || 0) + ' item(s)'"></td>

                                    {/* Extras Badge */}
                                    <td style="padding:0.65rem 0.75rem; text-align:center;">
                                        <template {...{ 'x-if': 'order.metadata && Object.keys(order.metadata).length > 0' }}>
                                            <span style="font-size: 0.65rem; background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 0.2rem 0.45rem; border-radius: 4px;">{'{ }'} json</span>
                                        </template>
                                        <template {...{ 'x-if': '!order.metadata || Object.keys(order.metadata).length === 0' }}>
                                            <span class="dash-table__muted">—</span>
                                        </template>
                                    </td>

                                    {/* Payment Method */}
                                    <td style="padding:0.65rem 0.75rem; color:var(--gb-text-muted);">
                                        <span style="display:inline-flex; align-items:center; gap:0.3rem;">
                                            <span x-text="order.payment_method === 'PIX' ? '🟣' : '💳'"></span>
                                            <span x-text="order.payment_method || 'PIX'"></span>
                                        </span>
                                    </td>

                                    {/* Total */}
                                    <td style="padding:0.65rem 0.75rem; text-align:right; font-weight:600; font-variant-numeric:tabular-nums;"
                                        {...{ ':style': "order.status === 'PAID' ? 'color:#4ade80;' : 'color:var(--gb-text-bright);'" }}
                                        x-text="currency(order.total_amount)"></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    )
}
