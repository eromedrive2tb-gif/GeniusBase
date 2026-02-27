/** @jsxImportSource hono/jsx */

/**
 * Organism: RegisterForm
 * Root/Dashboard/src/components/organisms/RegisterForm.tsx
 *
 * Responsabilidade única: formulário completo de registro compondo
 * moléculas (FormField, PasswordField) e átomos (Button, Spinner).
 */

import { FormField } from '../molecules/FormField'
import { PasswordField } from '../molecules/PasswordField'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'

export const RegisterForm = () => {
    return (
        <form
            {...{
                'hx-post': '/api/auth/register',
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
                autocomplete="new-password"
            />

            <PasswordField
                id="confirm_password"
                name="confirm_password"
                label="Confirm Password"
                autocomplete="new-password"
            />

            <Button
                type="submit"
                class="btn-primary btn-block"
                {...{ 'x-bind:disabled': 'loading' }}
            >
                <span {...{ 'x-show': 'loading', 'x-cloak': '' }}><Spinner /></span>
                <span {...{ 'x-text': "loading ? 'Creating account...' : 'Create Account'" }}>Create Account</span>
            </Button>

            <div id="auth-result" class="auth-result"></div>
        </form>
    )
}
