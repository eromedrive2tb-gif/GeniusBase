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
            title="Entrar"
            description="Faça login no painel do seu tenant"
            footerLink={{
                text: "Não tem uma conta?",
                label: 'Criar uma',
                href: '/register',
            }}
        >
            <LoginForm />
        </AuthLayout>
    )
}
