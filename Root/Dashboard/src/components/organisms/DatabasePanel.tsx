/** @jsxImportSource hono/jsx */

/**
 * Organism: Database Panel (Customers & Products)
 * Root/Dashboard/src/components/organisms/DatabasePanel.tsx
 */

type DatabasePanelProps = {
    customers: any[]
    products: any[]
}

export const DatabasePanel = ({ customers, products }: DatabasePanelProps) => {
    return (
        <div class="dash-panel" x-show="tab === 'database'" style="display: none;" x-data="{ dbTab: 'customers' }">
            <div class="dash-panel__header">
                <div>
                    <h2 class="dash-panel__title">Tabelas de Dados</h2>
                    <p class="dash-panel__subtitle">Ferramenta gerencial para visualização e adição manual de registros.</p>
                </div>

                {/* Sub-tabs for Database tables */}
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

            {/* Customers Table View */}
            <div class="table-container" x-show="dbTab === 'customers'">
                {/* Single Insert Action Bar */}
                <div class="action-bar">
                    <form
                        hx-post="/api/v1/customers"
                        hx-ext="json-enc"
                        {...{ 'hx-on:htmx:after-request': 'if(event.detail.successful) window.location.reload()' }}
                    >
                        <span class="action-bar__label">Adicionar Cliente Manualmente:</span>
                        <input type="text" name="name" placeholder="Nome Completo" required class="form-input" />
                        <input type="email" name="email" placeholder="E-mail do Cliente" required class="form-input" />
                        <button type="submit" class="btn-outline-cyan">+ Criar Registro</button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        onclick="exportTableToCSV('customers_table.csv', 'customers-table')"
                    >
                        📥 Exportar CSV
                    </button>
                </div>

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
                        {customers.length === 0 ? (
                            <tr>
                                <td colspan={4} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum cliente (customer) encontrado. Use o formulário acima para inserir.
                                </td>
                            </tr>
                        ) : (
                            customers.map((c: any) => (
                                <tr key={c.id}>
                                    <td><span class="dash-table__code">{c.id}</span></td>
                                    <td>{c.name}</td>
                                    <td class="dash-table__muted">{c.email}</td>
                                    <td class="dash-table__muted">{new Date(c.created_at * 1000).toLocaleString('pt-BR')}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Products Table View */}
            <div class="table-container" x-show="dbTab === 'products'" style="display: none;">
                {/* Single Insert Action Bar */}
                <div class="action-bar">
                    <form
                        hx-post="/api/v1/products"
                        hx-ext="json-enc"
                        {...{ 'hx-on:htmx:after-request': 'if(event.detail.successful) window.location.reload()' }}
                    >
                        <span class="action-bar__label">Adicionar Produto Manualmente:</span>
                        <input type="text" name="name" placeholder="Nome do Produto" required class="form-input" style="width: 250px;" />
                        <input type="number" name="price" placeholder="Preço (Centavos)" required class="form-input" style="width: 150px;" />
                        <input type="number" name="stock" placeholder="Estoque Inic." value="100" required class="form-input" style="width: 120px;" />
                        <button type="submit" class="btn-outline-cyan">+ Criar Registro</button>
                    </form>
                    <button
                        class="btn-outline-cyan"
                        onclick="exportTableToCSV('products_table.csv', 'products-table')"
                    >
                        📥 Exportar CSV
                    </button>
                </div>

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
                        {products.length === 0 ? (
                            <tr>
                                <td colspan={4} style="text-align: center; padding: 3rem;" class="dash-table__muted">
                                    Nenhum produto cadastrado. Use o formulário acima para inserir.
                                </td>
                            </tr>
                        ) : (
                            products.map((p: any) => (
                                <tr key={p.id}>
                                    <td><span class="dash-table__code">{p.id}</span></td>
                                    <td>{p.name}</td>
                                    <td class="dash-table__muted" style="color: var(--gb-cyan);">
                                        R$ {(p.price / 100).toFixed(2)}
                                    </td>
                                    <td class="dash-table__muted">{p.stock}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Alpine.js function for CSV Export */}
            <script dangerouslySetInnerHTML={{
                __html: `
                window.exportTableToCSV = function(filename, gridId) {
                    var csv = [];
                    var rows = document.querySelectorAll('#' + gridId + ' tr');
                    for (var i = 0; i < rows.length; i++) {
                        var row = [], cols = rows[i].querySelectorAll('td, th');
                        for (var j = 0; j < cols.length; j++) 
                            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
                        csv.push(row.join(','));
                    }
                    var csvFile = new Blob([csv.join('\\n')], {type: 'text/csv'});
                    var downloadLink = document.createElement('a');
                    downloadLink.download = filename;
                    downloadLink.href = window.URL.createObjectURL(csvFile);
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                }
            `}}></script>
        </div>
    )
}
