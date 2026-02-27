/** @jsxImportSource hono/jsx */

/**
 * Atom: Input
 * Root/Dashboard/src/components/atoms/Input.tsx
 *
 * Responsabilidade única: elemento <input> estilizado e tipado.
 */

interface InputProps {
    type?: string
    id: string
    name: string
    placeholder?: string
    required?: boolean
    autocomplete?: string
    [key: string]: any
}

export const Input = ({ type = 'text', id, name, placeholder, required, autocomplete, ...props }: InputProps) => {
    return (
        <input
            type={type}
            id={id}
            name={name}
            placeholder={placeholder}
            required={required}
            autocomplete={autocomplete}
            class="form-input"
            {...props}
        />
    )
}
