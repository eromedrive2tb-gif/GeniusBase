/** @jsxImportSource hono/jsx */

import { Badge } from '../atoms/Badge'
import { CodeBlock } from '../atoms/CodeBlock'
import type { ApiDocEntry } from '../../data/apiDocs'

interface AccordionItemProps {
    data: ApiDocEntry
    index: number
}

export const AccordionItem = ({ data, index }: AccordionItemProps) => {
    return (
        <div class="accordion-item" style={{
            border: '1px solid var(--gb-border)',
            borderRadius: 'var(--gb-radius-sm)',
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.2)'
        }}>
            <button
                type="button"
                {...{ '@click': `activeAccordion = activeAccordion === ${index} ? null : ${index}` }}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gb-text-bright)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Badge method={data.method} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{data.path}</span>
                </div>
                <span x-text={`activeAccordion === ${index} ? '−' : '+'`} style={{ fontSize: '1.25rem' }}></span>
            </button>

            <div
                x-show={`activeAccordion === ${index}`}
                x-collapse=""
                style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--gb-border)' }}
            >
                <p style={{ fontSize: '0.875rem', color: 'var(--gb-text-muted)', margin: '1rem 0' }}>
                    {data.description}
                </p>

                {data.request && (
                    <>
                        <h4 style={{ fontSize: '0.75rem', color: 'var(--gb-text-bright)', textTransform: 'uppercase' }}>
                            Request:
                        </h4>
                        <CodeBlock code={data.request} textColor="var(--gb-cyan)" />
                    </>
                )}

                {data.responseCode && (
                    <>
                        <h4 style={{ fontSize: '0.75rem', color: 'var(--gb-text-bright)', textTransform: 'uppercase' }}>
                            Respostas:
                        </h4>
                        <CodeBlock code={data.responseCode} textColor="#cbd5e1" />
                    </>
                )}

                {data.responses && data.responses.length > 0 && (
                    <>
                        <h4 style={{ fontSize: '0.75rem', color: 'var(--gb-text-bright)', textTransform: 'uppercase' }}>
                            Respostas Esperadas:
                        </h4>
                        <div>
                            {data.responses.map(res => (
                                <div>
                                    <span>
                                        <strong style={{ color: res.color }}>{res.status}</strong> {res.label}
                                    </span>
                                    <br />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
