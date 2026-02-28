/**
 * GeniusBase SDK — Realtime Channel
 * Root/SDK/src/realtime.ts
 *
 * Responsabilidade única: Prover uma API de subscrição declarativa sobre
 * o túnel WebSocket público do BaaS (/api/v1/realtime).
 *
 * O Tenant não interage com a API nativa do WebSocket nem gerencia
 * reconexões — este módulo abstrai tudo isso.
 *
 * Exemplo de uso:
 *   gb.channel('room:main')
 *     .on('customer.created', (payload) => console.log(payload))
 *     .subscribe()
 *
 * Protocolo esperado do servidor ({ type: 'PUSH', event: string, payload: any }):
 *   A mesma forma emitida por RealtimeState.broadcast() no backend.
 */

type EventCallback<T = unknown> = (payload: T) => void

export class Channel {
    private readonly channelName: string
    private readonly wsUrl: string
    private readonly listeners: Map<string, EventCallback[]>
    private ws: WebSocket | null = null
    private reconnectDelay = 1000 // ms, doubles on each failure (exp. backoff)

    constructor(channelName: string, wsUrl: string) {
        this.channelName = channelName
        this.wsUrl = wsUrl
        this.listeners = new Map()
    }

    /**
     * Register a callback for a specific event type.
     * Chainable: `.on('A', cb).on('B', cb).subscribe()`
     *
     * @param event    - Event name to listen for (matches server-sent event string)
     * @param callback - Function invoked with the event payload
     */
    on<T = unknown>(event: string, callback: EventCallback<T>): this {
        const existing = this.listeners.get(event) ?? []
        existing.push(callback as EventCallback)
        this.listeners.set(event, existing)
        return this
    }

    /**
     * Opens the WebSocket connection to the BaaS Realtime endpoint.
     * Starts automatic reconnection with exponential backoff on disconnect.
     * Safe to call multiple times — subsequent calls are no-ops if already open.
     */
    subscribe(): this {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return this
        this._connect()
        return this
    }

    /**
     * Gracefully closes the WebSocket and stops reconnection.
     */
    unsubscribe(): void {
        if (this.ws) {
            this.ws.onclose = null // prevent reconnect loop
            this.ws.close(1000, 'Channel unsubscribed')
            this.ws = null
        }
        this.reconnectDelay = 1000
    }

    private _connect(): void {
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onopen = () => {
            console.log(`[GeniusBase Realtime] Channel "${this.channelName}" connected`)
            this.reconnectDelay = 1000 // reset backoff on successful connection
        }

        this.ws.onmessage = (event: MessageEvent) => {
            let msg: { type?: string; event?: string; payload?: unknown }
            try {
                msg = JSON.parse(event.data as string)
            } catch {
                return
            }

            // Only handle server-push messages (same format as RealtimeState.broadcast)
            if (msg.type !== 'PUSH' || typeof msg.event !== 'string') return

            const callbacks = this.listeners.get(msg.event) ?? []
            for (const cb of callbacks) {
                try { cb(msg.payload) } catch { /* isolate callback failures */ }
            }
        }

        this.ws.onclose = (event: CloseEvent) => {
            if (event.wasClean) return // intentional close, no reconnect
            console.warn(
                `[GeniusBase Realtime] Channel "${this.channelName}" disconnected (code=${event.code}). ` +
                `Reconnecting in ${this.reconnectDelay}ms…`
            )
            setTimeout(() => {
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
                this._connect()
            }, this.reconnectDelay)
        }

        this.ws.onerror = () => {
            console.error(`[GeniusBase Realtime] Channel "${this.channelName}" WebSocket error`)
        }
    }
}

/**
 * Realtime module — creates named Channel instances.
 * Bound to the GeniusBaseClient and called via `gb.channel('name')`.
 */
export class RealtimeClient {
    private readonly wsUrl: string

    constructor(baseUrl: string, apiKey: string) {
        // Convert http(s) → ws(s) and append the token for auth
        const wsBase = baseUrl.replace(/^http/, 'ws')
        this.wsUrl = `${wsBase}/api/v1/realtime?token=${encodeURIComponent(apiKey)}`
    }

    channel(name: string): Channel {
        return new Channel(name, this.wsUrl)
    }
}
