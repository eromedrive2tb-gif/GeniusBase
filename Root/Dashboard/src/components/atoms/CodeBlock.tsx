/** @jsxImportSource hono/jsx */

interface CodeBlockProps {
    code: string
    textColor?: string
}

export const CodeBlock = ({ code, textColor = 'var(--gb-cyan)' }: CodeBlockProps) => {
    return (
        <pre style={{
            background: '#0f172a',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid #1e293b',
            marginBottom: '1rem',
            overflowX: 'auto'
        }}>
            <code style={{
                color: textColor,
                fontSize: '0.8125rem',
                fontFamily: 'monospace'
            }}>
                {code}
            </code>
        </pre>
    )
}
