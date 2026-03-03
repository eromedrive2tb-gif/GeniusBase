/**
 * Public BaaS Events Route — Igor Telemetry Module
 * Root/Engine/src/api/v1/events.ts
 *
 * Responsabilidade única: Receber eventos customizados disparados pelos apps
 * dos Tenants, persistir no D1 e notificar o Dashboard Admin em tempo real.
 *
 * Autenticação: apiKeyAuth (role: 'service' ou 'end_user').
 * Formato esperado: POST { "name": "string", "payload": { ...any } }
 *
 * Fluxo Realtime:
 *   POST /api/v1/events
 *   → D1 INSERT (tenant_events)
 *   → DASHBOARD_RPC_STATE.push('CUSTOM_EVENT_RECEIVED', record)
 *   → DashboardRPCState.broadcastEvent() → todas as abas admin do Tenant
 *   → rpcClient.js recebe msg sem reqId → dispara CustomEvent('rpc_push')
 *   → EventsPanel + ToastManager reagem
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'

const eventsRoute = createAuthRouter()

eventsRoute.use('*', apiKeyAuth)

eventsRoute.post('/', async (c) => {
    const tenantId = c.get('tenantId') as string

    let body: { name?: unknown; payload?: unknown }
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Body must be valid JSON' }, 400)
    }

    const name = (typeof body.name === 'string' ? body.name : '').trim()
    if (!name) {
        return c.json({ error: '"name" (string) is required' }, 400)
    }

    // payload is optional — accepts any serializable object
    const payloadObj = (body.payload !== undefined && body.payload !== null)
        ? body.payload
        : {}

    const id = `evt_${crypto.randomUUID().replace(/-/g, '')}`
    const payloadStr = JSON.stringify(payloadObj)
    const now = new Date().toISOString()

    try {
        await c.env.DB.prepare(
            'INSERT INTO tenant_events (id, tenant_id, name, payload, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, tenantId, name, payloadStr, now).run()
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'DB error'
        console.error('[events] D1 insert failed:', msg)
        return c.json({ error: 'Failed to persist event' }, 500)
    }

    const record = {
        id,
        tenant_id: tenantId,
        name,
        payload: payloadObj,
        created_at: now,
    }

    // ── Broadcast to admin Dashboard via the private RPC Durable Object ──
    // The DashboardRPCState maintains persistent WebSocket connections for
    // each Tenant's admin sessions. push() broadcasts to all of them.
    try {
        const doId = c.env.DASHBOARD_RPC_STATE.idFromName(tenantId)
        const stub = c.env.DASHBOARD_RPC_STATE.get(doId)
        await stub.push('CUSTOM_EVENT_RECEIVED', record)
    } catch (err) {
        // Non-fatal: the admin may not be online. Log and continue.
        console.warn('[events] Dashboard push failed (no active sessions?):', err)
    }

    return c.json({ success: true, data: record }, 201)
})

export { eventsRoute }
