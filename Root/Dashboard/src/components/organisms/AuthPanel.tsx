/** @jsxImportSource hono/jsx */

/**
 * Organism: Auth Panel (End-Users)
 * Root/Dashboard/src/components/organisms/AuthPanel.tsx
 */

type AuthPanelProps = {
    users: any[]
}

export const AuthPanel = ({ users }: AuthPanelProps) => {
    return (
        <div class="dash-panel" x-show="tab === 'auth'" style="display: none;">
            <div class="dash-panel__header">
                <div>
                    <h2 class="dash-panel__title">Usuários Finais</h2>
                    <p class="dash-panel__subtitle">Gerencie as contas dos usuários finais que acessam as suas aplicações integradas.</p>
                </div>
            </div>

            <div class="table-container">
                {/* HTMX Add User Action Bar */}
                <div class="action-bar">
                    <form
                        hx-post="/api/v1/auth/register"
                        hx-ext="json-enc"
                        {...{ 'hx-on:htmx:after-request': 'if(event.detail.successful) window.location.reload()' }}
                    >
                        <span class="action-bar__label">Adicionar Usuário Manualmente:</span>
                        <input type="email" name="email" placeholder="E-mail do Novo Usuário" required class="form-input" />
                        <input type="password" name="password" placeholder="Senha Forte" required minLength={6} class="form-input" />
                        <button type="submit" class="btn-outline-cyan">+ Adicionar Usuário</button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        onclick="exportTableToCSV('users_table.csv', 'users-table')"
                    >
                        📥 Exportar CSV
                    </button>
                </div>

                <table class="dash-table" id="users-table">
                    <thead>
                        <tr>
                            <th>User ID (sub)</th>
                            <th>E-mail</th>
                            <th>Último Login / Criação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colspan={3} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum usuário cadastrado neste Tenant ainda.
                                </td>
                            </tr>
                        ) : (
                            users.map((u: any) => (
                                <tr>
                                    <td><span class="dash-table__code">{u.id}</span></td>
                                    <td>{u.email}</td>
                                    <td class="dash-table__muted">
                                        {new Date(u.created_at * 1000).toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
