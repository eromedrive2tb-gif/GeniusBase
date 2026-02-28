/** @jsxImportSource hono/jsx */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface BadgeProps {
    method: HttpMethod
}

const methodColors: Record<HttpMethod, string> = {
    GET: 'var(--gb-blue)',
    POST: 'var(--gb-green)',
    PUT: 'var(--gb-amber)',
    DELETE: 'var(--gb-red)',
    PATCH: 'var(--gb-purple)'
}

export const Badge = ({ method }: BadgeProps) => {
    return (
        <span style={{
            background: methodColors[method] || 'var(--gb-blue)',
            color: 'white',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
        }}>
            {method}
        </span>
    )
}
