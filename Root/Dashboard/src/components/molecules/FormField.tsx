/** @jsxImportSource hono/jsx */

/**
 * Molecule: FormField
 * Root/Dashboard/src/components/molecules/FormField.tsx
 *
 * Responsabilidade única: compor Label + Input em um grupo de formulário.
 */

import { Label } from '../atoms/Label'
import { Input } from '../atoms/Input'

interface FormFieldProps {
    id: string
    name: string
    label: string
    type?: string
    placeholder?: string
    required?: boolean
    autocomplete?: string
}

export const FormField = ({
    id,
    name,
    label,
    type = 'text',
    placeholder,
    required,
    autocomplete,
}: FormFieldProps) => {
    return (
        <div class="form-group">
            <Label for={id}>{label}</Label>
            <Input
                type={type}
                id={id}
                name={name}
                placeholder={placeholder}
                required={required}
                autocomplete={autocomplete}
            />
        </div>
    )
}
