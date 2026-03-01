/** @jsxImportSource hono/jsx */

/**
 * Organism: DashboardTabs
 * Root/Dashboard/src/components/organisms/DashboardTabs.tsx
 *
 * Responsabilidade única: renderizar a barra de abas do dashboard.
 * Alpine.js controla o estado da aba ativa (`tab`) no lado do cliente.
 * Nenhuma lógica de negócio — apenas UI de navegação.
 */

interface Tab {
    id: string
    label: string
    icon: string
}

const tabs: Tab[] = [
    { id: 'database', label: 'Tabelas de Dados', icon: '🗄️' },
    { id: 'auth', label: 'Usuários Finais', icon: '👥' },
    { id: 'orders', label: 'Pedidos / Vendas', icon: '📦' },
    { id: 'core', label: 'APIs Principais', icon: '🔑' },
    { id: 'events', label: 'Eventos / Logs', icon: '⚡' },
    { id: 'docs', label: 'Documentação', icon: '📖' },
    { id: 'gateways', label: 'Gateways de Pagamento', icon: '💳' },
]

export const DashboardTabs = () => {
    return (
        <nav class="dash-tabs" role="tablist">
            {tabs.map((t) => (
                <button
                    key={t.id}
                    role="tab"
                    {...{
                        'x-on:click': `tab = '${t.id}'`,
                        'x-bind:class': `tab === '${t.id}' ? 'dash-tab dash-tab--active' : 'dash-tab'`,
                    }}
                >
                    <span>{t.icon}</span> {t.label}
                </button>
            ))}
        </nav>
    )
}
