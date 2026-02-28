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
                <div class="dash-wrapper" x-data="{ tab: 'core' }">
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
            </body>
        </html>
    )
}
