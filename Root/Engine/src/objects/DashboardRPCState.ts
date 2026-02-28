/**
 * DashboardRPCState Durable Object
 * Root/Engine/src/objects/DashboardRPCState.ts
 *
 * Responsabilidade única: Protocolo WebSocket RPC + Pub/Sub de Domain Events.
 *
 * Fluxo de tenantId:
 *   Worker route injeta 'x-tenant-id' no Request → tagged no WebSocket via
 *   ctx.acceptWebSocket(server, ['tid:<tenantId>']) → recuperado via getTags(ws).
 *
 * Domain Event Flow:
 *   client A → { action: 'CREATE_CUSTOMER', reqId } → handler D1 INSERT
 *   → ctx.broadcast callback → broadcastEvent('CUSTOMER_CREATED', payload, excludeWs: wsA)
 *   → client B recebe { type: 'PUSH', event: 'CUSTOMER_CREATED', payload }
 *   → client A recebe { action, reqId, response: { success: true, data } }
 *
 * Protocolo (Client → Server):
 *   { action: string, payload?: Record<string, unknown>, reqId: string }
 *
 * Protocolo (Server → Client, RPC response):
 *   { action: string, reqId: string, response: { success: boolean, data?: unknown, error?: string } }
 *
 * Protocolo (Server → Client, Domain Event push):
 *   { type: 'PUSH', event: string, payload: unknown }
 */

import { DurableObject } from 'cloudflare:workers'
import { commandRegistry } from '../rpc/registry'

export class DashboardRPCState extends DurableObject<Env> {
    constructor(state: DurableObjectState, env: Env) {
        super(state, env)
    }

    /**
     * WebSocket upgrade handshake.
     * Auth validated by adminAuth before this fetch.
     * Tags the socket with 'tid:<tenantId>' for stateless tenantId retrieval.
     */
    async fetch(request: Request): Promise<Response> {
        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
            return new Response('WebSocket Upgrade Required', {
                status: 426,
                headers: { 'Content-Type': 'text/plain' },
            })
        }

        const tenantId = request.headers.get('x-tenant-id') ?? 'unknown'

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        this.ctx.acceptWebSocket(server, [`tid:${tenantId}`])

        server.send(JSON.stringify({
            type: 'CONNECTED',
            timestamp: new Date().toISOString(),
        }))

        return new Response(null, { status: 101, webSocket: client })
    }

    /**
     * Broadcasts a domain event to all connected clients in this tenant's DO instance,
     * optionally excluding the originating socket (the sender already updated its own UI).
     *
     * Message format: { type: 'PUSH', event: string, payload: unknown }
     * The rpcClient.js CustomEvent('rpc_push') handler on the frontend maps to this.
     *
     * @param event      - Domain event name, e.g. 'CUSTOMER_CREATED'
     * @param payload    - Arbitrary serializable data (the new entity record)
     * @param excludeWs  - If set, this specific socket will NOT receive the broadcast
     *                     (the creator already updated its local state via Promise resolution)
     */
    broadcastEvent(event: string, payload: unknown, excludeWs?: WebSocket): void {
        const message = JSON.stringify({ type: 'PUSH', event, payload })
        for (const ws of this.ctx.getWebSockets()) {
            if (ws === excludeWs) continue
            try { ws.send(message) } catch { /* closed socket, safe to ignore */ }
        }
    }

    /**
     * RPC Dispatcher with Domain Event broadcast support.
     *
     * Passes a bound `broadcast` callback into RpcContext so handlers can push
     * events to peer sessions without coupling to the DO class directly.
     * This keeps registry handlers independently testable.
     */
    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const raw = typeof message === 'string'
            ? message
            : new TextDecoder().decode(message as ArrayBuffer)

        // ── Parse & validate RPC envelope ─────────────────
        let action: string
        let payload: Record<string, unknown>
        let reqId: string

        try {
            const parsed = JSON.parse(raw) as { action?: unknown; payload?: unknown; reqId?: unknown }
            if (typeof parsed.action !== 'string' || typeof parsed.reqId !== 'string') {
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    error: 'Invalid envelope: action (string) and reqId (string) are required',
                }))
                return
            }
            action = parsed.action
            payload = (typeof parsed.payload === 'object' && parsed.payload !== null)
                ? (parsed.payload as Record<string, unknown>)
                : {}
            reqId = parsed.reqId
        } catch {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Malformed JSON' }))
            return
        }

        // ── Look up handler in registry ───────────────────
        const handler = commandRegistry[action]
        if (!handler) {
            ws.send(JSON.stringify({
                action, reqId,
                response: { success: false, error: `Unknown action: "${action}"` },
            }))
            return
        }

        // ── Retrieve tenantId from WebSocket tag ──────────
        const tags = this.ctx.getTags(ws)
        const tenantId = tags.find(t => t.startsWith('tid:'))?.slice(4) ?? ''

        // ── Execute handler with env + broadcast callback ─
        try {
            // The broadcast callback excludes the originating WebSocket (ws):
            // the sender resolves its Promise with the new record and updates
            // its own UI instantly — other sessions receive the Push event.
            const broadcast = (event: string, eventPayload: unknown) =>
                this.broadcastEvent(event, eventPayload, ws)

            const data = await handler({ payload, tenantId, env: this.env, broadcast })
            ws.send(JSON.stringify({ action, reqId, response: { success: true, data } }))
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err)
            console.error(`[DashboardRPCState] Handler "${action}" failed:`, errorMessage)
            ws.send(JSON.stringify({
                action, reqId,
                response: { success: false, error: errorMessage },
            }))
        }
    }

    async webSocketClose(_ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
        console.log(`[DashboardRPCState] Closed: code=${code} reason="${reason}" clean=${wasClean}`)
    }

    async webSocketError(_ws: WebSocket, error: unknown): Promise<void> {
        console.error('[DashboardRPCState] Error:', error)
    }

    /**
     * Server-initiated push to all connected admin sessions of this Tenant.
     * Called by background Workers to notify the Dashboard of async events.
     */
    async push(event: string, data: unknown): Promise<void> {
        this.broadcastEvent(event, data)
    }
}
