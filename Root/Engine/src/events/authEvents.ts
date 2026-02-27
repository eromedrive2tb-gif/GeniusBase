/**
 * EDA Auth Event Emitter
 * Root/Engine/src/events/authEvents.ts
 *
 * Emits authentication audit events using ctx.executionCtx.waitUntil()
 * so the audit log write happens in background without blocking the response.
 */

import type { Context } from 'hono'
import type { AuthEvent, AuthEventType } from '../types/auth'

/**
 * Emit an authentication event to the D1 audit_log table in background.
 *
 * @param c - Hono context (must have DB binding and executionCtx)
 * @param event - The auth event details
 */
export function emitAuthEvent(
    c: Context<{ Bindings: Env }>,
    event: Omit<AuthEvent, 'id' | 'created_at'>
): void {
    const id = crypto.randomUUID()

    const promise = c.env.DB.prepare(
        `INSERT INTO audit_log (id, tenant_id, user_id, event_type, ip_address, user_agent, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
        .bind(
            id,
            event.tenant_id,
            event.user_id,
            event.event_type,
            event.ip_address,
            event.user_agent,
            event.metadata ? JSON.stringify(event.metadata) : null
        )
        .run()
        .catch((err) => {
            console.error(`[EDA] Failed to write audit event ${event.event_type}:`, err)
        })

    // Non-blocking: the response is sent immediately, audit write continues in background
    c.executionCtx.waitUntil(promise)
}

/**
 * Helper to extract request metadata for audit events.
 */
export function extractRequestMeta(c: Context): {
    ip_address: string | null
    user_agent: string | null
} {
    return {
        ip_address: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        user_agent: c.req.header('user-agent') || null,
    }
}
