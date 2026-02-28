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
    { id: 'core', label: 'APIs Principais', icon: '⚡' },
    { id: 'gateways', label: 'Gateways de Pagamento', icon: '💳' },
    { id: 'docs', label: 'Docs & Integração', icon: '📖' },
]

export const DashboardTabs = () => {
    return (
        <nav class="dash-tabs" role="tablist">
            {tabs.map((t) => (
                <button
                    key={t.id}
                    role="tab"
                    class="dash-tab"
                    {...{
                        'x-on:click': `tab = '${t.id}'`,
                        'x-bind:class': `tab === '${t.id}' ? 'dash-tab dash-tab--active' : 'dash-tab'`,
                        'x-bind:aria-selected': `tab === '${t.id}'`,
                    }}
                >
                    <span>{t.icon}</span> {t.label}
                </button>
            ))}
        </nav>
    )
}
