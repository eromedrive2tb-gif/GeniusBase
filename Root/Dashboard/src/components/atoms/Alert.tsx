/** @jsxImportSource hono/jsx */

/**
 * Atom: Alert
 * Root/Dashboard/src/components/atoms/Alert.tsx
 *
 * Responsabilidade única: div de alerta visual (error/success/info).
 */

interface AlertProps {
    variant: 'error' | 'success' | 'info'
    children: any
}

export const Alert = ({ variant, children }: AlertProps) => {
    return (
        <div class={`alert alert-${variant}`} {...{ role: 'alert' }}>
            {children}
        </div>
    )
}
