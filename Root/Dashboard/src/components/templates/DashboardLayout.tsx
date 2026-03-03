/** @jsxImportSource hono/jsx */

/**
 * Template: DashboardLayout
 * Root/Dashboard/src/components/templates/DashboardLayout.tsx
 *
 * Responsabilidade: prover o "shell" do painel autenticado (head, styles base,
 * e a TopBar unificada com botão de logout).
 */

import { html } from 'hono/html'

interface DashboardLayoutProps {
    title: string
    children: any // Hono JSX elements
}

export const DashboardLayout = ({ title, children }: DashboardLayoutProps) => {
    return (
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <meta name="description" content="Painel Multi-Tenant GeniusBase" />

                <script src="https://unpkg.com/htmx.org@1.9.10"></script>
                <script src="https://unpkg.com/htmx.org/dist/ext/json-enc.js"></script>
                {/* rpcClient MUST load before Alpine so window.rpc exists when x-init fires */}
                <script src="/scripts/rpcClient.js"></script>
                <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

                {/* HTMX: Allow swapping error responses (4xx/5xx) into the DOM */}
                <script dangerouslySetInnerHTML={{
                    __html: `
          document.addEventListener('htmx:beforeSwap', function(evt) {
            if (evt.detail.xhr.status >= 400) {
              evt.detail.shouldSwap = true;
              evt.detail.isError = false;
            }
          });
        ` }}></script>

                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

                <link rel="stylesheet" href="/styles/main.css" />
            </head>

            <body>
                <div class="dash-wrapper" x-data="{ tab: 'analytics' }">
                    {/* ─── Top Bar ──────────────────────────────── */}
                    <header class="dash-topbar">
                        <div>
                            <div class="dash-topbar__brand">GeniusBase</div>
                            <div class="dash-topbar__meta">Agregador de APIs Multi-Tenant</div>
                        </div>
                        <div class="dash-topbar__actions">
                            <form method="post" action="/api/auth/logout" style="margin:0">
                                <button type="submit" class="btn-ghost">Sair</button>
                            </form>
                        </div>
                    </header>

                    {/* Children content (Tabs + Panels) */}
                    {children}
                </div>

                {/* ─── Toast Notifications ────────────────── */}
                {/* Listens to rpc_push CustomEvent from rpcClient.js */}
                <div
                    style="position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999; display:flex; flex-direction:column; gap:0.5rem; pointer-events:none;"
                    {...{
                        'x-data': 'toastManager()',
                        '@rpc_push.window': 'handlePush($event.detail)',
                    }}
                >
                    <template {...{ 'x-for': 't in toasts', ':key': 't.id' }}>
                        <div
                            style="background:#1e293b; border:1px solid rgba(6,182,212,0.4); border-left:3px solid #06b6d4; border-radius:6px; padding:0.75rem 1rem; min-width:260px; max-width:340px; box-shadow:0 4px 20px rgba(0,0,0,0.4); pointer-events:auto; animation: fadeSlideIn 0.2s ease;"
                            {...{ 'x-show': 't.visible', 'x-transition': '' }}
                        >
                            <div style="font-size:0.72rem; color:var(--gb-cyan); font-weight:600; margin-bottom:0.2rem;" {...{ 'x-text': 't.label' }}></div>
                            <div style="font-size:0.8rem; color:#e2e8f0;" {...{ 'x-text': 't.body' }}></div>
                        </div>
                    </template>
                </div>

                <script dangerouslySetInnerHTML={{
                    __html: `
                    function toastManager() {
                        return {
                            toasts: [],
                            handlePush({ event, payload }) {
                                if (event !== 'CUSTOM_EVENT_RECEIVED') return;
                                const id = Date.now();
                                const name = payload?.name ?? 'Evento';
                                const keys = Object.keys(payload?.payload ?? {}).slice(0, 2).join(', ');
                                this.toasts.unshift({
                                    id,
                                    label: '⚡ Novo Evento Recebido',
                                    body: name + (keys ? ' · ' + keys : ''),
                                    visible: true,
                                });
                                // Cap at 5 visible toasts
                                if (this.toasts.length > 5) this.toasts.pop();
                                // Auto-dismiss after 4 seconds
                                setTimeout(() => {
                                    const t = this.toasts.find(t => t.id === id);
                                    if (t) t.visible = false;
                                    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
                                }, 4000);
                            },
                        };
                    }
                `}}></script>
            </body>
        </html>
    )
}
