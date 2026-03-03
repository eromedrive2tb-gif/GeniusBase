/**
 * GeniusBase SDK — Auth Module
 * Root/SDK/src/auth.ts
 *
 * Responsabilidade única: Autenticar End-Users do Tenant via
 * as API públicas de Auth do BaaS (/api/v1/auth/*).
 *
 * Não gerencia sessões (localStorage, cookies) intencionalmente —
 * o Tenant decide como persistir o JWT do end-user retornado.
 */

export interface AuthResponse<T> {
    data: T | null
    error: string | null
}

export interface Session {
    token: string
    user_id: string
    tenant_id: string
    expires_at: number
}

export interface UserRecord {
    id: string
    tenant_id: string
    email: string
    created_at: number
}

export class AuthClient {
    private readonly baseUrl: string
    private readonly apiKey: string
    private readonly headers: Record<string, string>
    public onTokenUpdate?: (token: string) => void

    setToken(token: string) {
        this.headers["Authorization"] = `Bearer ${token}`
    }

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    /**
     * Register a new end-user in the Tenant's namespace.
     * Returns the user record; does NOT log them in.
     */
    async register(email: string, password: string): Promise<AuthResponse<UserRecord>> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ email, password }),
            })
            if (!res.ok) return { data: null, error: await res.text() }
            return { data: (await res.json()) as UserRecord, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }

    /**
     * Login an existing end-user.
     * Returns a Session object containing the JWT token.
     * The Tenant is responsible for persisting the token (e.g. localStorage).
     */
    async login(email: string, password: string): Promise<AuthResponse<Session>> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ email, password }),
            })
            if (!res.ok) return { data: null, error: await res.text() }

            const session = (await res.json()) as Session
            // Auto-upgrade the SDK state explicitly replacing the anon_key with the end_user JWT
            this.onTokenUpdate?.(session.token)

            return { data: session, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }
}
