/**
 * Auth Type Definitions
 * Root/Engine/src/types/auth.ts
 */

// ─── Database Models ───────────────────────────────────────

export interface Tenant {
    id: string
    name: string
    slug: string
    api_key_prefix: string | null
    created_at: string
}

export interface User {
    id: string
    tenant_id: string
    email: string
    password_hash: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    created_at: string
}

// ─── Token Payload ─────────────────────────────────────────

export interface TokenPayload {
    /** Subject — the user ID */
    sub: string
    /** Tenant ID — for multi-tenant isolation */
    tid: string
    /** JWT ID — unique token identifier for revocation via KV */
    jti: string
    /** User role within the tenant */
    role: string
    /** Issued at — Unix timestamp (seconds) */
    iat: number
    /** Expiration — Unix timestamp (seconds) */
    exp: number
}

// ─── EDA Event Types ───────────────────────────────────────

export type AuthEventType = 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'API_KEY_GENERATED'

export interface AuthEvent {
    id: string
    tenant_id: string | null
    user_id: string | null
    event_type: AuthEventType
    ip_address: string | null
    user_agent: string | null
    metadata: Record<string, unknown> | null
    created_at: string
}

// ─── API Request / Response ────────────────────────────────

export interface LoginRequest {
    email: string
    password: string
    tenant_slug: string
}

// ─── Hono Context Variables ────────────────────────────────

export interface AuthVariables {
    tenantId: string
    userId: string
    userRole: string
}
