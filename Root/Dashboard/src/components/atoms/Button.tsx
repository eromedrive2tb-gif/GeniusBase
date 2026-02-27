/** @jsxImportSource hono/jsx */

interface ButtonProps {
    children: any
    class?: string
    [key: string]: any
}

export const Button = ({ children, class: className, ...props }: ButtonProps) => {
    return (
        <button class={`btn ${className || ''}`} {...props}>
            {children}
        </button>
    )
}
