/** @jsxImportSource hono/jsx */

/**
 * Organism: DocsPanel
 * Root/Dashboard/src/components/organisms/DocsPanel.tsx
 *
 * Responsabilidade: Renderizar puramente a aba 3 (Documentação & Integração)
 * focada na segurança do Frontend e o snippet de configuração do JWT.
 */

export const DocsPanel = () => {
    return (
        <div x-show="tab === 'docs'" x-cloak="">
            <div class="dash-panel">
                <h2 class="panel-title">Documentação &amp; Integração</h2>
                <p class="panel-subtitle">Como integrar as APIs GeniusBase com seu frontend Serverless.</p>

                {/* Auth Flow */}
                <div class="doc-section">
                    <h3 class="doc-section__title">1. Fluxo de Autenticação</h3>
                    <p>
                        Chame <code>POST /api/auth/login</code> com <code>email</code> e <code>password</code>.
                        O servidor retorna um JWT em um cookie <code>HttpOnly</code> (para painéis SSR) e também via
                        um cabeçalho <code>HX-Redirect</code> para fluxos HTMX.
                    </p>
                    <p>
                        Para frontends SPA/Serverless (Vite, React, Lovable), você receberá o token no
                        corpo da resposta e deve armazená-lo em memória (nunca no <code>localStorage</code>).
                    </p>
                </div>

                {/* Security Warning */}
                <div class="doc-important">
                    <div class="doc-important__title">⚠ Regra Crítica de Segurança</div>
                    <p>
                        Seu frontend SPA <strong>NUNCA</strong> deve ter acesso a segredos de backend
                        (<code>JWT_SECRET</code>, chaves de API, credenciais de banco de dados). O frontend apenas recebe
                        um JWT após o login e o envia no cabeçalho <code>Authorization: Bearer &lt;token&gt;</code>
                        em requisições subsequentes. Toda validação ocorre no lado do servidor.
                    </p>
                </div>

                {/* API Integration */}
                <div class="doc-section">
                    <h3 class="doc-section__title">2. Chamando APIs do seu Frontend</h3>
                    <p>
                        Após obter o JWT, use o <code>fetch()</code> padrão para chamar qualquer endpoint escopado por tenant.
                        O middleware resolve automaticamente o tenant a partir da reivindicação <code>tid</code> do token.
                    </p>
                </div>

                {/* Code Snippet */}
                <div class="code-block">
                    <div class="code-block__header">
                        <span class="code-block__lang">JavaScript</span>
                    </div>
                    <pre dangerouslySetInnerHTML={{
                        __html: `<span class="cmt">// Exemplo: Buscar produtos para o tenant autenticado</span>
<span class="kw">const</span> <span class="var">token</span> = <span class="str">'eyJhbGciOi...'</span>; <span class="cmt">// obtido no login</span>

<span class="kw">const</span> <span class="var">response</span> = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'https://seu-worker.dev/api/v1/products'</span>, {
  <span class="var">method</span>: <span class="str">'GET'</span>,
  <span class="var">headers</span>: {
    <span class="str">'Authorization'</span>: <span class="str">\`Bearer \${token}\`</span>,
    <span class="str">'Content-Type'</span>: <span class="str">'application/json'</span>,
  },
});

<span class="kw">const</span> <span class="var">products</span> = <span class="kw">await</span> <span class="var">response</span>.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(<span class="var">products</span>);` }}></pre>
                </div>

                {/* Supported Frameworks */}
                <div class="doc-section">
                    <h3 class="doc-section__title">3. Frameworks de Frontend Suportados</h3>
                    <ul>
                        <li><strong>Vite + React/Vue</strong> — Use <code>fetch()</code> na sua camada de API</li>
                        <li><strong>Lovable</strong> — Ações HTTP com cabeçalho Bearer</li>
                        <li><strong>HTMX (SSR)</strong> — Token no cookie <code>HttpOnly</code>, sem necessidade de JS</li>
                        <li><strong>JS Puro</strong> — <code>fetch()</code> padrão como mostrado acima</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
