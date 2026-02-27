/** @jsxImportSource hono/jsx */

/**
 * Atom: Label
 * Root/Dashboard/src/components/atoms/Label.tsx
 *
 * Responsabilidade única: elemento <label> estilizado.
 */

interface LabelProps {
    for: string
    children: any
}

export const Label = ({ for: htmlFor, children }: LabelProps) => {
    return (
        <label for={htmlFor} class="form-label">
            {children}
        </label>
    )
}
