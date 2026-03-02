/** @jsxImportSource hono/jsx */

/**
 * Organism: Database Panel (Customers & Products)
 * Root/Dashboard/src/components/organisms/DatabasePanel.tsx
 *
 * Renderiza a estrutura estática do painel de dados.
 * Toda a reatividade de dados (fetch, insert, estado) é gerenciada pelo
 * Alpine.js controller `databaseController()` definido na <script> abaixo,
 * que comunica EXCLUSIVAMENTE via `window.rpc` (WebSocket RPC).
 *
 * Os dados iniciais são hidratados via SSR (props teachers/products) para
 * evitar um FOUC (Flash of Unstyled Content) no carregamento inicial da página.
 * Mutações (CREATE) atualizam o array reativo localmente, sem re-fetch.
 */

export interface Customer {
    id: string
    name: string
    email: string | null
    created_at: number
}

export interface Product {
    id: string
    name: string
    price: number
    stock: number
    created_at: number
}

type DatabasePanelProps = {
    customers: Customer[]
    products: Product[]
}

export const DatabasePanel = ({ customers, products }: DatabasePanelProps) => {
    // Serialize SSR data to JSON for Alpine hydration — escape </script> sequences
    const initCustomers = JSON.stringify(customers).replace(/<\/script>/gi, '<\\/script>')
    const initProducts = JSON.stringify(products).replace(/<\/script>/gi, '<\\/script>')

    return (
        <div
            class="dash-panel"
            x-show="tab === 'database'"
            style="display: none;"
            {...{
                'x-data': `databaseController(${initCustomers}, ${initProducts})`,
                'x-init': 'init()',
            }}
        >
            <div class="dash-panel__header">
                <div>
                    <h2 class="dash-panel__title">Tabelas de Dados</h2>
                    <p class="dash-panel__subtitle">Ferramenta gerencial para visualização e adição manual de registros.</p>
                </div>

                {/* Sub-tabs */}
                <nav class="dash-tabs dash-tabs--sub">
                    <button
                        {...{
                            'x-on:click': "dbTab = 'customers'",
                            'x-bind:class': "dbTab === 'customers' ? 'dash-tab dash-tab--active' : 'dash-tab'"
                        }}
                    >
                        👥 Customers
                    </button>
                    <button
                        {...{
                            'x-on:click': "dbTab = 'products'",
                            'x-bind:class': "dbTab === 'products' ? 'dash-tab dash-tab--active' : 'dash-tab'"
                        }}
                    >
                        📦 Products
                    </button>
                </nav>
            </div>

            {/* ─── Customers Tab ──────────────────────────── */}
            <div class="table-container" x-show="dbTab === 'customers'">
                <div class="action-bar">
                    <form {...{ 'x-on:submit.prevent': 'submitCustomer($event)' }}>
                        <span class="action-bar__label">Adicionar Cliente Manualmente:</span>
                        <input type="text" name="name" placeholder="Nome Completo" required class="form-input" />
                        <input type="email" name="email" placeholder="E-mail do Cliente" class="form-input" />
                        <button
                            type="submit"
                            class="btn-outline-cyan"
                            {...{ 'x-bind:disabled': 'loadingCustomer' }}
                        >
                            <span {...{ 'x-text': "loadingCustomer ? 'Salvando…' : '+ Criar Registro'" }}></span>
                        </button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        {...{ '@click': "exportTableToCSV('customers_table.csv', 'customers-table')" }}
                    >
                        📥 Exportar CSV
                    </button>
                </div>

                {/* Inline error banner */}
                <p
                    style="color: #ff6b6b; padding: 0 1rem 0.5rem; font-size: 0.82rem; min-height: 1.25rem;"
                    {...{ 'x-text': 'customerError' }}
                ></p>

                <table class="dash-table" id="customers-table">
                    <thead>
                        <tr>
                            <th>ID do Cliente</th>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Criado em</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Empty state shown while customers array is empty */}
                        <template {...{ 'x-if': 'customers.length === 0' }}>
                            <tr>
                                <td colspan={4} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum cliente encontrado. Use o formulário acima para inserir.
                                </td>
                            </tr>
                        </template>

                        {/* Reactive rows — rendered by Alpine, keyed on id */}
                        <template
                            {...{ 'x-for': 'c in customers', ':key': 'c.id' }}
                        >
                            <tr>
                                <td><span class="dash-table__code" {...{ 'x-text': 'c.id' }}></span></td>
                                <td {...{ 'x-text': 'c.name' }}></td>
                                <td class="dash-table__muted" {...{ 'x-text': 'c.email ?? "—"' }}></td>
                                <td class="dash-table__muted" {...{ 'x-text': 'new Date(c.created_at * 1000).toLocaleString("pt-BR")' }}></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            {/* ─── Products Tab ───────────────────────────── */}
            <div class="table-container" x-show="dbTab === 'products'" style="display: none;">
                <div class="action-bar">
                    <form {...{ 'x-on:submit.prevent': 'submitProduct($event)' }}>
                        <span class="action-bar__label">Adicionar Produto Manualmente:</span>
                        <input type="text" name="name" placeholder="Nome do Produto" required class="form-input" style="width: 250px;" />
                        <input type="number" name="price" placeholder="Preço (Centavos)" required class="form-input" style="width: 150px;" />
                        <input type="number" name="stock" placeholder="Estoque Inic." value="100" class="form-input" style="width: 120px;" />
                        <button
                            type="submit"
                            class="btn-outline-cyan"
                            {...{ 'x-bind:disabled': 'loadingProduct' }}
                        >
                            <span {...{ 'x-text': "loadingProduct ? 'Salvando…' : '+ Criar Registro'" }}></span>
                        </button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        {...{ '@click': "exportTableToCSV('products_table.csv', 'products-table')" }}
                    >
                        📥 Exportar CSV
                    </button>
                </div>

                <p
                    style="color: #ff6b6b; padding: 0 1rem 0.5rem; font-size: 0.82rem; min-height: 1.25rem;"
                    {...{ 'x-text': 'productError' }}
                ></p>

                <table class="dash-table" id="products-table">
                    <thead>
                        <tr>
                            <th>ID do Produto</th>
                            <th>Nome do Produto</th>
                            <th>Preço (Centavos)</th>
                            <th>Estoque</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template {...{ 'x-if': 'products.length === 0' }}>
                            <tr>
                                <td colspan={4} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum produto cadastrado. Use o formulário acima para inserir.
                                </td>
                            </tr>
                        </template>

                        <template {...{ 'x-for': 'p in products', ':key': 'p.id' }}>
                            <tr>
                                <td><span class="dash-table__code" {...{ 'x-text': 'p.id' }}></span></td>
                                <td {...{ 'x-text': 'p.name' }}></td>
                                <td class="dash-table__muted" style="color: var(--gb-cyan);"
                                    {...{ 'x-text': '"R$ " + (p.price / 100).toFixed(2)' }}></td>
                                <td class="dash-table__muted" {...{ 'x-text': 'p.stock' }}></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            {/* ─── Alpine Controller + Utilities ─────────── */}
            <script dangerouslySetInnerHTML={{
                __html: `
                function databaseController(initCustomers, initProducts) {
                    return {
                        dbTab: 'customers',
                        customers: initCustomers,
                        products: initProducts,
                        loadingCustomer: false,
                        loadingProduct: false,
                        customerError: '',
                        productError: '',

                        async init() {
                            // Data hydrated via SSR — no RPC call needed on load.
                            // Listen for domain events broadcast by the DO to peer sessions.
                            // Deduplication: the CREATOR already unshifted() via Promise resolve,
                            // so we check the id before adding to avoid a double-entry.
                            window.addEventListener('rpc_push', (e) => {
                                const { event, payload } = e.detail || {};
                                if (event === 'CUSTOMER_CREATED' && payload?.id) {
                                    if (!this.customers.find(c => c.id === payload.id)) {
                                        this.customers.unshift(payload);
                                    }
                                }
                                if (event === 'PRODUCT_CREATED' && payload?.id) {
                                    if (!this.products.find(p => p.id === payload.id)) {
                                        this.products.unshift(payload);
                                    }
                                }
                            });
                        },

                        async submitCustomer(e) {
                            const form = e.target;
                            const name  = form.elements['name'].value.trim();
                            const email = form.elements['email'].value.trim();
                            if (!name) { this.customerError = 'O nome é obrigatório.'; return; }
                            this.customerError = '';
                            this.loadingCustomer = true;
                            try {
                                const record = await window.rpc.request('CREATE_CUSTOMER', { name, email });
                                this.customers.unshift(record);
                                form.reset();
                            } catch (err) {
                                this.customerError = err.message || 'Erro ao criar cliente.';
                            } finally {
                                this.loadingCustomer = false;
                            }
                        },

                        async submitProduct(e) {
                            const form  = e.target;
                            const name  = form.elements['name'].value.trim();
                            const price = Number(form.elements['price'].value);
                            const stock = Number(form.elements['stock'].value) || 0;
                            if (!name || isNaN(price)) { this.productError = 'Nome e Preço são obrigatórios.'; return; }
                            this.productError = '';
                            this.loadingProduct = true;
                            try {
                                const record = await window.rpc.request('CREATE_PRODUCT', { name, price, stock });
                                this.products.unshift(record);
                                form.reset();
                            } catch (err) {
                                this.productError = err.message || 'Erro ao criar produto.';
                            } finally {
                                this.loadingProduct = false;
                            }
                        },

                        exportTableToCSV(filename, gridId) {
                            const csv = [];
                            const rows = document.querySelectorAll('#' + gridId + ' tr');
                            for (const row of rows) {
                                const cols = row.querySelectorAll('td, th');
                                csv.push([...cols].map(c => '"' + c.innerText.replace(/"/g, '""') + '"').join(','));
                            }
                            const blob = new Blob([csv.join('\\n')], { type: 'text/csv' });
                            const a = Object.assign(document.createElement('a'), {
                                download: filename,
                                href: URL.createObjectURL(blob),
                                style: 'display:none',
                            });
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                        }
                    };
                }
            `}}></script>
        </div>
    )
}
