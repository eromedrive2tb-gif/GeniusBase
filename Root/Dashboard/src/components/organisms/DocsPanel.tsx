/** @jsxImportSource hono/jsx */

import { baasApiDocs, webhookGuide } from '../../data/apiDocs'
import { AccordionItem } from '../molecules/AccordionItem'

export const DocsPanel = () => {
    return (
        <div x-show="tab === 'docs'" x-cloak="" class="dash-panel">
            <h2 class="panel-title">Documentação de Integração API (BaaS)</h2>
            <p class="panel-subtitle">Guia oficial para integrar o GeniusBase no seu frontend ou app.</p>

            {/* ─── Auth intro ──────────────────────────────────────── */}
            <div class="doc-section" style="margin-bottom: 2rem;">
                <h3 class="doc-section__title">Autenticação</h3>
                <p style="margin-bottom: 0.75rem; color: var(--gb-text-muted); font-size: 0.875rem;">
                    Todas as requisições para <code>/api/v1/*</code> exigem o <strong>Service API Key</strong> do seu Workspace.
                </p>
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--gb-border); border-radius: var(--gb-radius-sm); padding: 1rem;">
                    <pre style="background: #0f172a; padding: 0.75rem; border-radius: 4px; border: 1px solid #1e293b; overflow-x: auto; margin:0;">
                        <code style="color: var(--gb-cyan); font-family: monospace; font-size: 0.875rem;">{'Authorization: Bearer <SEU_SERVICE_API_KEY>'}</code>
                    </pre>
                </div>
            </div>

            {/* ─── 🚨 Security Alert ────────────────────────────────── */}
            <div class="doc-section" style="margin-bottom: 2rem;">
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 1.25rem 1.5rem;">
                    <h3 style="font-size: 0.95rem; font-weight: 700; color: #ef4444; margin: 0 0 0.5rem;">
                        ⚠️ Regra de Ouro do GeniusBase: Service API Key vs End-User JWT
                    </h3>
                    <p style="font-size: 0.85rem; color: #f8fafc; margin: 0; line-height: 1.5;">
                        A sua <strong>Service API Key</strong> (exibida na aba APIs Principais) tem poder total sobre o seu banco de dados e deve ser usada <strong>APENAS</strong> em servidores (Backend) ou via SDK Server-Side. Para o Frontend dos seus clientes/usuários finais, utilize sempre o <strong>End-User JWT</strong> gerado via <code>/api/v1/auth/login</code>. Nunca exponha sua Service API Key no frontend público!
                    </p>
                </div>
            </div>

            {/* ─── 🚨 Webhook Guide ────────────────────────────────── */}
            <div class="doc-section" style="margin-bottom: 2rem;">
                <div style="background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.35); border-radius: 8px; padding: 1.25rem 1.5rem;">
                    <h3 style="font-size: 0.95rem; font-weight: 700; color: #fbbf24; margin: 0 0 0.25rem;">
                        🚨 Como Configurar Webhooks de Pagamento
                    </h3>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin: 0 0 1.25rem;">
                        <strong style="color: #fbbf24;">ATENÇÃO:</strong>{' '}Para que o seu site receba a confirmação de pagamento em tempo real,
                        <strong> NÃO aponte o webhook para o seu frontend.</strong> O seu frontend é Serverless e não deve processar webhooks diretamente.
                        Configure o URL abaixo na sua gateway e o GeniusBase fará o resto.
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        {webhookGuide.map((step) => (
                            <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                                <span style="font-size: 1.2rem; flex-shrink: 0; line-height: 1;">{step.icon}</span>
                                <div style="flex: 1;">
                                    <div style="font-size: 0.82rem; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem;">{step.title}</div>
                                    <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: step.code ? '0.5rem' : '0';">
                                        {step.description}
                                    </div>
                                    {step.code && (
                                        <pre style="background: #0a0a14; border: 1px solid #1e293b; border-radius: 4px; padding: 0.6rem 0.85rem; margin: 0.35rem 0 0; overflow-x: auto;">
                                            <code style="font-family: monospace; font-size: 0.75rem; color: #06b6d4; white-space: pre;">{step.code}</code>
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── API Reference ───────────────────────────────────── */}
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
