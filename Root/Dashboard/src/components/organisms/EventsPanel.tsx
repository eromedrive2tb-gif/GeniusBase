/** @jsxImportSource hono/jsx */

/**
 * Organism: Events Panel (Igor Telemetry Module)
 * Root/Dashboard/src/components/organisms/EventsPanel.tsx
 *
 * Exibe o log de eventos customizados em tempo real.
 * 100% Alpine.js reativo + WebSocket RPC.
 *
 * - SSR hydration via prop `events` (zero FOUC)
 * - Novos eventos chegam via Domain Event 'CUSTOM_EVENT_RECEIVED' (rpc_push)
 * - Payload exibido como JSON pretty-printed colapsável
 */

type EventRecord = {
    id: string
    name: string
    payload: any
    created_at: number
}

type EventsPanelProps = {
    events: EventRecord[]
}

export const EventsPanel = ({ events }: EventsPanelProps) => {
    const initEvents = JSON.stringify(events).replace(/<\/script>/gi, '<\\/script>')

    return (
        <div
            class="dash-panel"
            x-show="tab === 'events'"
            style="display: none;"
            {...{
                'x-data': `eventsController(${initEvents})`,
                'x-init': 'init()',
            }}
        >
            <div class="dash-panel__header">
                <div>
                    <h2 class="dash-panel__title">⚡ Eventos / Logs</h2>
                    <p class="dash-panel__subtitle">
                        Telemetria em tempo real — eventos customizados disparados pelos seus apps via <code>POST /api/v1/events</code>.
                    </p>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    {/* Live counter badge */}
                    <span
                        class="badge badge--active"
                        style="font-size:0.75rem;"
                        {...{ 'x-text': '`${events.length} evento(s)`' }}
                    ></span>
                    <button
                        class="btn-ghost"
                        style="font-size:0.78rem;"
                        {...{ 'x-on:click': 'events = []' }}
                    >
                        🗑 Limpar
                    </button>
                </div>
            </div>

            {/* ─── Empty state ──────────────────────────── */}
            <div
                style="text-align:center; padding:4rem 2rem; color:var(--gb-text-muted);"
                {...{ 'x-show': 'events.length === 0' }}
            >
                <div style="font-size:2.5rem; margin-bottom:1rem;">📡</div>
                <p style="margin:0; font-size:0.9rem;">Nenhum evento registrado ainda.</p>
                <p style="margin:0.5rem 0 0; font-size:0.8rem; opacity:0.6;">
                    Dispare um evento via <code>POST /api/v1/events</code> para vê-lo aqui em tempo real.
                </p>
            </div>

            {/* ─── Events log ───────────────────────────── */}
            <div class="table-container" {...{ 'x-show': 'events.length > 0' }}>
                <table class="dash-table" style="table-layout:auto;">
                    <thead>
                        <tr>
                            <th style="width:160px;">Data / Hora</th>
                            <th style="width:200px;">Nome do Evento</th>
                            <th>Payload (JSON)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template {...{ 'x-for': 'ev in events', ':key': 'ev.id' }}>
                            <tr>
                                <td class="dash-table__muted" style="white-space:nowrap; font-size:0.8rem;"
                                    {...{ 'x-text': 'ev.created_at ? (!isNaN(new Date(ev.created_at).getTime()) ? new Date(ev.created_at).toLocaleString("pt-BR") : ev.created_at) : "—"' }}>
                                </td>
                                <td>
                                    <span
                                        class="badge"
                                        style="background:rgba(6,182,212,0.12); color:var(--gb-cyan); border-color:rgba(6,182,212,0.3); font-size:0.78rem;"
                                        {...{ 'x-text': 'ev.name' }}
                                    ></span>
                                </td>
                                <td>
                                    <pre
                                        style="margin:0; padding:0.4rem 0.6rem; background:#0f172a; border-radius:4px; font-size:0.75rem; color:#94a3b8; max-height:120px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;"
                                        {...{ 'x-text': 'JSON.stringify(ev.payload, null, 2)' }}
                                    ></pre>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            {/* ─── Alpine Controller ──────────────────── */}
            <script dangerouslySetInnerHTML={{
                __html: `
                function eventsController(initEvents) {
                    return {
                        events: initEvents,

                        async init() {
                            // Data hydrated via SSR — listen for live Domain Events
                            window.addEventListener('rpc_push', (e) => {
                                const { event, payload } = e.detail || {};
                                if (event === 'CUSTOM_EVENT_RECEIVED' && payload?.id) {
                                    if (!this.events.find(ev => ev.id === payload.id)) {
                                        this.events.unshift(payload);
                                        // Cap at 50 to match backend limit
                                        if (this.events.length > 50) this.events.pop();
                                    }
                                }
                            });
                        },
                    };
                }
            `}}></script>
        </div>
    )
}
