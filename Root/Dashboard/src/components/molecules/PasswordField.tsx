/** @jsxImportSource hono/jsx */

/**
 * Molecule: PasswordField
 * Root/Dashboard/src/components/molecules/PasswordField.tsx
 *
 * Responsabilidade única: campo de senha com toggle de visibilidade
 * usando Alpine.js para reatividade no cliente.
 */

import { Label } from '../atoms/Label'

interface PasswordFieldProps {
    id: string
    name: string
    label: string
    placeholder?: string
    autocomplete?: string
}

export const PasswordField = ({
    id,
    name,
    label,
    placeholder = '••••••••',
    autocomplete = 'current-password',
}: PasswordFieldProps) => {
    return (
        <div class="form-group">
            <Label for={id}>{label}</Label>
            <div class="password-wrapper">
                <input
                    {...{ 'x-bind:type': "showPassword ? 'text' : 'password'" }}
                    id={id}
                    name={name}
                    placeholder={placeholder}
                    required
                    autocomplete={autocomplete}
                    class="form-input"
                />
                <button
                    type="button"
                    class="password-toggle"
                    {...{
                        'x-on:click': 'showPassword = !showPassword',
                        'x-text': "showPassword ? 'Hide' : 'Show'",
                    }}
                >
                    Show
                </button>
            </div>
        </div>
    )
}
