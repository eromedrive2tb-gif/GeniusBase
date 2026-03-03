/** @jsxImportSource hono/jsx */

/**
 * Organism: SettingsPanel
 * Root/Dashboard/src/components/organisms/SettingsPanel.tsx
 *
 * Responsabilidade única: Permitir que o Lojista gerencie múltiplos Webhooks
 * com suporte a Eventos granulares (EDA).
 */

export const SettingsPanel = () => {
    return (
        <section
            id="settings"
            class="dash-panel"
            {...{
                'x-show': "tab === 'settings'",
                'style': 'display: none;',
                'x-data': 'webhooksController()',
            }}
        >
            <div class="panel-header">
                <h2 class="panel-title">Webhooks & Integrações EDA</h2>
                <p class="panel-desc">Gere gatilhos assíncronos em tempo real para conectar o seu App a serviços externos.</p>
            </div>

            <div class="dash-grid" style="grid-template-columns: 1fr; max-width: 900px;">

                {/* Form to Add Webhook */}
                <div class="dash-card" style="margin-bottom: 2rem;">
                    <h3 class="card-title">Adicionar Novo Webhook</h3>
                    <form class="form-group" {...{ '@submit.prevent': 'addWebhook' }}>
                        <div class="input-wrapper">
                            <label class="input-label">URL de Destino (Endpoint HTTP POST)</label>
                            <input
                                type="url"
                                class="input-field"
                                placeholder="https://seu-sistema.com/webhooks"
                                required
                                {...{ 'x-model': 'newUrl' }}
                            />
                        </div>

                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; align-items: flex-start; max-height: 250px; overflow-y: auto; padding-right: 1rem;">
                            {/* Eventos Core */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Global & Custom</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="*" {...{ 'x-model': 'newEvents' }} /> Tudo (*)
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="CUSTOM_EVENT_RECEIVED" {...{ 'x-model': 'newEvents' }} /> Evento Customizado (/events)
                                </label>
                            </div>

                            {/* Ecommerce: Pedidos */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Pedidos (E-commerce)</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="ORDER_CREATED" {...{ 'x-model': 'newEvents' }} /> Pedido Criado (Aguardando Pagamento)
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="ORDER_PAID" {...{ 'x-model': 'newEvents' }} /> Pedido Pago (Checkout Concluído)
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="ORDER_EXPIRED" {...{ 'x-model': 'newEvents' }} /> Pedido Expirado / Cancelado
                                </label>
                            </div>

                            {/* Transacoes Avulsas */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Transações Avulsas (PIX/Doações)</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="TRANSACTION_CREATED" {...{ 'x-model': 'newEvents' }} /> Nova Transação Criada
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="TRANSACTION_COMPLETED" {...{ 'x-model': 'newEvents' }} /> Transação Paga
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="TRANSACTION_EXPIRED" {...{ 'x-model': 'newEvents' }} /> Transação Expirada
                                </label>
                            </div>

                            {/* Entidades & CRM */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Clientes (CRM)</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="CUSTOMER_CREATED" {...{ 'x-model': 'newEvents' }} /> Novo Cliente Cadastrado
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="CUSTOMER_UPDATED" {...{ 'x-model': 'newEvents' }} /> Perfil do Cliente Atualizado
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="CUSTOMER_DELETED" {...{ 'x-model': 'newEvents' }} /> Cliente Excluído
                                </label>
                            </div>

                            {/* Produtos */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Catálogo e Produtos</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="PRODUCT_CREATED" {...{ 'x-model': 'newEvents' }} /> Novo Produto Criado
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="PRODUCT_UPDATED" {...{ 'x-model': 'newEvents' }} /> Produto Editado
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="PRODUCT_DELETED" {...{ 'x-model': 'newEvents' }} /> Produto Excluído
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="PRODUCT_OUT_OF_STOCK" {...{ 'x-model': 'newEvents' }} /> Produto Esgotado (Out of Stock)
                                </label>
                            </div>

                            {/* Auth & Setup */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Autenticação & End-Users</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="END_USER_REGISTERED" {...{ 'x-model': 'newEvents' }} /> Usuário Final Criou Conta
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="END_USER_LOGGED_IN" {...{ 'x-model': 'newEvents' }} /> Usuário FInal fez Login
                                </label>
                            </div>

                            {/* Armazenamento R2 */}
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 200px;">
                                <strong style="color: var(--text-color); font-size: 0.85rem; padding-bottom: 0.25rem;">Storage R2</strong>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="FILE_UPLOADED" {...{ 'x-model': 'newEvents' }} /> Arquivo Enviado
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-color); font-size: 0.9rem;">
                                    <input type="checkbox" value="FILE_DELETED" {...{ 'x-model': 'newEvents' }} /> Arquivo Excluído
                                </label>
                            </div>
                        </div>

                        <div style="margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" {...{ 'x-bind:disabled': 'isSaving' }}>
                                <span {...{ 'x-text': "isSaving ? 'Salvando...' : '+ Adicionar Webhook'" }}></span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* List of Webhooks */}
                <div class="dash-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 class="card-title">Webhooks Ativos</h3>
                        <button class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;" {...{ '@click': 'loadWebhooks' }}>
                            ↻ Atualizar
                        </button>
                    </div>

                    <div {...{ 'x-show': 'webhooks.length === 0' }} style="color: var(--gb-gray); font-size: 0.9rem;">
                        Nenhum webhook registrado.
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <template {...{ 'x-for': 'hook in webhooks', ':key': 'hook.id' }}>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;" {...{ 'x-text': 'hook.url' }}></div>
                                    <div style="font-size: 0.8rem; color: var(--gb-blue); font-family: monospace;" {...{ 'x-text': "JSON.parse(hook.events).join(', ')" }}></div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: var(--gb-blue); color: var(--gb-blue);" title="Dispara 1 evento de teste (Ping)" {...{ '@click': 'testWebhook(hook)' }}>
                                        Ping
                                    </button>
                                    <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: #8b5cf6; color: #8b5cf6;" title="Força disparo de 18+ eventos simulados na URL" {...{ '@click': 'testAllEvents(hook)' }}>
                                        Testar Full
                                    </button>
                                    <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: var(--gb-red); color: var(--gb-red);" title="Excluir Webhook" {...{ '@click': 'deleteWebhook(hook.id)' }}>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
                function webhooksController() {
                    return {
                        webhooks: [],
                        isSaving: false,
                        newUrl: '',
                        newEvents: ['*'],

                        async init() {
                            await this.loadWebhooks();
                        },
                        async loadWebhooks() {
                            try {
                                const data = await window.rpc.request('FETCH_WEBHOOKS');
                                this.webhooks = data || [];
                            } catch (err) {
                                console.error('Failed to load webhooks', err);
                            }
                        },
                        async addWebhook() {
                            if (!this.newUrl || this.newEvents.length === 0) {
                                alert('Preencha a URL e selecione ao menos um evento.');
                                return;
                            }
                            this.isSaving = true;
                            try {
                                await window.rpc.request('ADD_WEBHOOK', { url: this.newUrl, events: this.newEvents });
                                this.newUrl = '';
                                this.newEvents = ['*'];
                                await this.loadWebhooks();
                            } catch (err) {
                                alert('Erro: ' + (err.message || 'Desconhecido'));
                            } finally {
                                this.isSaving = false;
                            }
                        },
                        async deleteWebhook(id) {
                            if (!confirm('Deseja excluir este Webhook?')) return;
                            try {
                                await window.rpc.request('DELETE_WEBHOOK', { id });
                                await this.loadWebhooks();
                            } catch (err) {
                                alert('Erro: ' + err.message);
                            }
                        },
                        async testWebhook(hook) {
                            try {
                                const res = await window.rpc.request('TEST_WEBHOOK', { url: hook.url });
                                if (res.success) {
                                    alert('✅ Webhook Ping disparado com sucesso! (Status ' + res.status + ')');
                                } else {
                                    alert('⚠️ O Webhook respondeu ao Ping, mas com status de erro (Status ' + res.status + ')');
                                }
                            } catch (err) {
                                alert('❌ Falha ao disparar Ping:\\n' + err.message);
                            }
                        },
                        async testAllEvents(hook) {
                            if (!confirm('Este teste irá sobrecarregar sua URL forçando o envio de TODOS os eventos conhecidos pela Engine (cerca de 18+) consecutivamente contendo DADOS SIMULADOS para te ajudar estruturar o sistema. Deseja iniciar o ataque?')) return;
                            try {
                                const res = await window.rpc.request('TEST_ALL_WEBHOOK_EVENTS', { url: hook.url });
                                alert('✅ Disparos Multi-Evento Concluídos!\\nSucesso em ' + res.successCount + ' de ' + res.total + ' eventos.\\n\\nAbra os logs do seu Endpoint Receptor de Webhook para descobrir como a Engine de GeniusBase monta seus Payloads JSON para E-commerce, Assinaturas, Transações e Identidade.');
                            } catch (err) {
                                alert('❌ Falha na bateria de testes:\\n' + err.message);
                            }
                        }
                    }
                }
                `
            }} />
        </section>
    )
}
