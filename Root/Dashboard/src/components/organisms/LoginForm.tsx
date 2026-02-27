/** @jsxImportSource hono/jsx */

/**
 * Organism: LoginForm
 * Root/Dashboard/src/components/organisms/LoginForm.tsx
 *
 * Responsabilidade única: formulário completo de login compondo
 * moléculas (FormField, PasswordField) e átomos (Button, Spinner).
 * O HTMX faz POST sem reload. Alpine.js controla loading state.
 */

import { FormField } from '../molecules/FormField'
import { PasswordField } from '../molecules/PasswordField'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'

export const LoginForm = () => {
    return (
        <form
            {...{
                'hx-post': '/api/auth/login',
                'hx-target': '#auth-result',
                'hx-swap': 'innerHTML',
                'x-on:htmx:before-request': 'loading = true',
                'x-on:htmx:after-request': 'loading = false',
            }}
        >

            <FormField
                id="email"
                name="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                required
                autocomplete="email"
            />

            <PasswordField
                id="password"
                name="password"
                label="Password"
                autocomplete="current-password"
            />

            <Button
                type="submit"
                class="btn-primary btn-block"
                {...{ 'x-bind:disabled': 'loading' }}
            >
                <span {...{ 'x-show': 'loading', 'x-cloak': '' }}><Spinner /></span>
                <span {...{ 'x-text': "loading ? 'Signing in...' : 'Sign In'" }}>Sign In</span>
            </Button>

            <div id="auth-result" class="auth-result"></div>
        </form>
    )
}
