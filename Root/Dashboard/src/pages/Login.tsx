/** @jsxImportSource hono/jsx */

/**
 * Page: Login
 * Root/Dashboard/src/pages/Login.tsx
 *
 * Responsabilidade única: compor AuthLayout + LoginForm.
 * Nenhum CSS inline. Nenhuma lógica de negócio.
 */

import { AuthLayout } from '../components/templates/AuthLayout'
import { LoginForm } from '../components/organisms/LoginForm'

export const Login = () => {
    return (
        <AuthLayout
            title="Login"
            description="Sign in to your tenant dashboard"
            footerLink={{
                text: "Don't have an account?",
                label: 'Create one',
                href: '/register',
            }}
        >
            <LoginForm />
        </AuthLayout>
    )
}
