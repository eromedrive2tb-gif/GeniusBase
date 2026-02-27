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
            title="Register"
            description="Create your account"
            footerLink={{
                text: 'Already have an account?',
                label: 'Sign in',
                href: '/login',
            }}
        >
            <RegisterForm />
        </AuthLayout>
    )
}
