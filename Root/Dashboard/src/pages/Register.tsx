/** @jsxImportSource hono/jsx */

/**
 * Page: Register
 * Root/Dashboard/src/pages/Register.tsx
 *
 * Responsabilidade única: compor AuthLayout + RegisterForm.
 * Nenhum CSS inline. Nenhuma lógica de negócio.
 */

import { AuthLayout } from '../components/templates/AuthLayout'
import { RegisterForm } from '../components/organisms/RegisterForm'

export const Register = () => {
    return (
        <AuthLayout
            title="Registrar"
            description="Crie sua conta"
            footerLink={{
                text: 'Já tem uma conta?',
                label: 'Entrar',
                href: '/login',
            }}
        >
            <RegisterForm />
        </AuthLayout>
    )
}
