/** @jsxImportSource hono/jsx */

import { baasApiDocs } from '../../data/apiDocs'
import { AccordionItem } from '../molecules/AccordionItem'

export const DocsPanel = () => {
    return (
        <div x-show="tab === 'docs'" x-cloak="" class="dash-panel">
            <h2 class="panel-title">Documentação de Integração API (BaaS)</h2>
            <p class="panel-subtitle">Guia oficial para interagir com o Backend-as-a-Service do GeniusBase no seu próprio frontend serverless.</p>

            <div class="doc-section" style="margin-bottom: 2rem;">
                <h3 class="doc-section__title">Introdução & Autenticação</h3>
                <p style="margin-bottom: 0.75rem; color: var(--gb-text-muted); font-size: 0.875rem;">
                    Todas as requisições para os endpoints <code>/api/v1/*</code> exigem o seu <strong>Token de Tenant</strong> para identificar o seu Workspace.
                </p>
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--gb-border); border-radius: var(--gb-radius-sm); padding: 1rem;">
                    <p style="font-size: 0.8125rem; margin-bottom: 0.5rem; color: var(--gb-text-bright);">Envie o token do seu Tenant (Workspace) no Header de todas as requisições servidor-para-servidor:</p>
                    <pre style="background: #0f172a; padding: 0.75rem; border-radius: 4px; border: 1px solid #1e293b; overflow-x: auto;">
                        <code style="color: var(--gb-cyan); font-family: monospace; font-size: 0.875rem;">Authorization: Bearer &lt;SEU_TOKEN_DE_TENANT&gt;</code>
                    </pre>
                </div>
                <p style="margin-top: 1rem; color: var(--gb-amber); font-size: 0.8125rem;">
                    <strong>Aviso:</strong> Para as rotas de End-Users (como <code>/api/v1/auth/login</code> e <code>register</code>), você também passará o Header acima para que o GeniusBase saiba de qual Workspace a requisição se destina. Após o login, a API retornará um Token JWT de End-User.
                </p>
            </div>

            <div class="doc-section" x-data="{ activeAccordion: null }">
                <h3 class="doc-section__title" style="margin-bottom: 1rem;">Referência de API</h3>

                <div class="accordion-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    {baasApiDocs.map((doc, index) => (
                        <AccordionItem data={doc} index={index + 1} />
                    ))}
                </div>
            </div>
        </div>
    )
}
