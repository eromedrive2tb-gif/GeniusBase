/** @jsxImportSource hono/jsx */

/**
 * Organism: Auth Panel (Usuários Finais do Tenant)
 * Root/Dashboard/src/components/organisms/AuthPanel.tsx
 *
 * Gerencia os End-Users (tabela `tenant_users`) via WebSocket RPC.
 * Zero HTMX/HTTP — 100% Alpine.js reativo + window.rpc.
 *
 * SSR hydration: `initUsers` é serializado como JSON na prop e injetado
 * no Alpine controller, evitando FOUC e um RPC call extra no carregamento.
 *
 * Domain Events escutados (via rpc_push CustomEvent do rpcClient.js):
 *   USER_CREATED → unshift se não duplicado
 *   USER_DELETED → filter out por id
 */

type AuthPanelProps = {
    users: any[]
}

export const AuthPanel = ({ users }: AuthPanelProps) => {
    const initUsers = JSON.stringify(users).replace(/<\/script>/gi, '<\\/script>')

    return (
        <div
            class="dash-panel"
            x-show="tab === 'auth'"
            style="display: none;"
            {...{
                'x-data': `usersController(${initUsers})`,
                'x-init': 'init()',
            }}
        >
            <div class="dash-panel__header">
                <div>
                    <h2 class="dash-panel__title">Usuários Finais</h2>
                    <p class="dash-panel__subtitle">Gerencie as contas dos usuários finais que acessam as suas aplicações integradas.</p>
                </div>
            </div>

            <div class="table-container">
                {/* ─── Create User Form ──────────────────── */}
                <div class="action-bar">
                    <form {...{ 'x-on:submit.prevent': 'submitUser($event)' }}>
                        <span class="action-bar__label">Adicionar Usuário Manualmente:</span>
                        <input
                            type="email"
                            name="email"
                            placeholder="E-mail do Novo Usuário"
                            required
                            class="form-input"
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Senha (mín. 6 caracteres)"
                            required
                            minLength={6}
                            class="form-input"
                        />
                        <button
                            type="submit"
                            class="btn-outline-cyan"
                            {...{ 'x-bind:disabled': 'loadingUser' }}
                        >
                            <span {...{ 'x-text': "loadingUser ? 'Adicionando…' : '+ Adicionar Usuário'" }}></span>
                        </button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        onclick="exportTableToCSV('users_table.csv', 'users-table')"
                    >
                        📥 Exportar CSV
                    </button>
                </div>

                {/* Inline error banner */}
                <p
                    style="color: #ff6b6b; padding: 0 1rem 0.5rem; font-size: 0.82rem; min-height: 1.25rem;"
                    {...{ 'x-text': 'userError' }}
                ></p>

                {/* ─── Users Table ───────────────────────── */}
                <table class="dash-table" id="users-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>E-mail</th>
                            <th>Criado em</th>
                            <th style="text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template {...{ 'x-if': 'users.length === 0' }}>
                            <tr>
                                <td colspan={4} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum usuário cadastrado neste Tenant ainda.
                                </td>
                            </tr>
                        </template>

                        <template {...{ 'x-for': 'u in users', ':key': 'u.id' }}>
                            <tr>
                                <td>
                                    <span class="dash-table__code" {...{ 'x-text': 'u.id' }}></span>
                                </td>
                                <td {...{ 'x-text': 'u.email' }}></td>
                                <td class="dash-table__muted"
                                    {...{ 'x-text': 'new Date(u.created_at * 1000).toLocaleString("pt-BR")' }}>
                                </td>
                                <td style="text-align: center;">
                                    <button
                                        class="btn-ghost"
                                        style="color: #ff6b6b; font-size: 0.78rem; padding: 0.2rem 0.6rem;"
                                        {...{ 'x-on:click': 'deleteUser(u.id)' }}
                                    >
                                        🗑 Remover
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            {/* ─── Alpine Controller ──────────────────────── */}
            <script dangerouslySetInnerHTML={{
                __html: `
                function usersController(initUsers) {
                    return {
                        users: initUsers,
                        loadingUser: false,
                        userError: '',

                        async init() {
                            // Data hydrated via SSR — no RPC call needed on load.
                            // Listen for domain events from peer sessions.
                            window.addEventListener('rpc_push', (e) => {
                                const { event, payload } = e.detail || {};

                                if (event === 'USER_CREATED' && payload?.id) {
                                    if (!this.users.find(u => u.id === payload.id)) {
                                        this.users.unshift(payload);
                                    }
                                }
                                if (event === 'USER_DELETED' && payload?.id) {
                                    this.users = this.users.filter(u => u.id !== payload.id);
                                }
                            });
                        },

                        async submitUser(e) {
                            const form     = e.target;
                            const email    = form.elements['email'].value.trim();
                            const password = form.elements['password'].value;

                            if (!email || !password) {
                                this.userError = 'E-mail e senha são obrigatórios.';
                                return;
                            }
                            if (password.length < 6) {
                                this.userError = 'A senha deve ter no mínimo 6 caracteres.';
                                return;
                            }

                            this.userError = '';
                            this.loadingUser = true;
                            try {
                                const record = await window.rpc.request('CREATE_USER', { email, password });
                                this.users.unshift(record);
                                form.reset();
                            } catch (err) {
                                this.userError = err.message || 'Erro ao criar usuário.';
                            } finally {
                                this.loadingUser = false;
                            }
                        },

                        async deleteUser(id) {
                            if (!confirm('Tem certeza que deseja remover este usuário? Esta ação é irreversível.')) return;
                            try {
                                await window.rpc.request('DELETE_USER', { id });
                                // Optimistic immediate removal — the broadcast will deduplicate for peers
                                this.users = this.users.filter(u => u.id !== id);
                            } catch (err) {
                                this.userError = err.message || 'Erro ao remover usuário.';
                            }
                        },
                    };
                }
            `}}></script>
        </div>
    )
}
