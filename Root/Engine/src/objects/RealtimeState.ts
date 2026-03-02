/**
 * RealtimeState Durable Object
 * Root/Engine/src/objects/RealtimeState.ts
 *
 * Responsabilidade única: Gerenciar conexões WebSocket por Tenant usando a
 * Cloudflare Durable Objects WebSocket Hibernation API.
 *
 * Cada Tenant tem a sua própria instância de DO (derivada pelo tenantId no router).
 * Isso garante isolamento completo: um broadcast de um Tenant nunca vaza para outro.
 *
 * Design intencional: NÃO há lógica de negócio aqui. Este DO é puro pub/sub de
 * infraestrutura. Toda lógica de domínio deve ser processada pelos Workers antes
 * de chamar `broadcast()` neste DO.
 */

import { DurableObject } from 'cloudflare:workers'

export class RealtimeState extends DurableObject<Env> {
    constructor(state: DurableObjectState, env: Env) {
        super(state, env)
    }

    /**
     * Handles incoming HTTP requests to the DO.
     * Expects a WebSocket upgrade request — returns 426 for all other requests.
     *
     * The Worker route (/api/v1/realtime) validates auth BEFORE reaching this fetch,
     * so no token validation happens here (defense in depth is at the edge).
     */
    async fetch(request: Request): Promise<Response> {
        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
            return new Response('WebSocket Upgrade Required', {
                status: 426,
                headers: { 'Content-Type': 'text/plain' },
            })
        }

        // Create a WebSocket pair: [0] goes to the client, [1] stays in the DO
        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        // Use Hibernation API — the DO can sleep between messages,
        // restoring the WebSocket connection transparently when a message arrives.
        this.ctx.acceptWebSocket(server)

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    /**
     * Called by the Cloudflare runtime when a hibernated WebSocket receives a message.
     * Routes the message back to all connected sockets in this tenant's DO instance.
     *
     * @param ws      - The WebSocket that sent the message
     * @param message - Raw message payload (string or binary)
     */
    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        // Echo-broadcast: forward the message to all connected clients in this tenant room.
        // In production this would be gated by event type and routing rules.
        const payload = typeof message === 'string'
            ? message
            : JSON.stringify({ type: 'binary', size: (message as ArrayBuffer).byteLength })

        for (const socket of this.ctx.getWebSockets()) {
            socket.send(payload)
        }
    }

    /**
     * Called when a client disconnects (graceful close).
     * The Hibernation API handles cleanup automatically; this hook is for logging/metrics.
     */
    async webSocketClose(
        _ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean
    ): Promise<void> {
        console.log(`[RealtimeState] WebSocket closed: code=${code} reason="${reason}" clean=${wasClean}`)
    }

    /**
     * Called when a WebSocket encounters an error.
     */
    async webSocketError(_ws: WebSocket, error: unknown): Promise<void> {
        console.error('[RealtimeState] WebSocket error:', error)
    }

    /**
     * Public API for Workers to push events to all connected clients in this tenant's room.
     * Called by Hono route handlers after processing domain events (e.g., DB mutations).
     *
     * Example usage in a Worker:
     * ```ts
     * const id = c.env.REALTIME_STATE.idFromName(tenantId)
     * const stub = c.env.REALTIME_STATE.get(id)
     * await stub.broadcast(JSON.stringify({ event: 'customer.created', data: { id } }))
     * ```
     *
     * @param message - JSON-serializable event string to broadcast
     */
    public async broadcast(message: string): Promise<void> {
        for (const ws of this.ctx.getWebSockets()) {
            ws.send(message)
        }
    }
}
