/**
 * RpcClient — Dashboard WebSocket Remote Procedure Call Client
 * Root/Dashboard/src/scripts/rpcClient.js
 *
 * Served as a static script at /scripts/rpcClient.js.
 * Manages a persistent WebSocket connection to /api/internal/realtime
 * and exposes a Promise-based request() API over the binary socket.
 *
 * Protocol (both directions):
 *   Client → Server: { action: string, payload?: any, reqId: string }
 *   Server → Client: { action: string, reqId: string, response: { success: bool, data?, error? } }
 *   Server → Client: { type: 'EVENT', event: string, data: any }  ← Server Push (no reqId)
 *   Server → Client: { type: 'CONNECTED' }                        ← Handshake confirmation
 *
 * Usage:
 *   await window.rpc.request('FETCH_DASHBOARD_STATS')
 *   window.addEventListener('rpc_push', e => console.log(e.detail))
 */

class RpcClient {
    constructor() {
        /** @type {Map<string, { resolve: Function, reject: Function, timer: number }>} */
        this.pendingRequests = new Map()
        /** @type {WebSocket | null} */
        this.ws = null
        /** @type {'connecting' | 'open' | 'closed'} */
        this.status = 'connecting'
        /** Promise that resolves when the socket is ready */
        this._readyPromise = null
        this._readyResolve = null

        this._connect()
    }

    _connect() {
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve
        })

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        this.ws = new WebSocket(`${protocol}//${location.host}/api/internal/realtime`)

        this.ws.onopen = () => {
            this.status = 'open'
            console.log('[RpcClient] WebSocket tunnel established')
        }

        this.ws.onmessage = (event) => {
            let msg
            try {
                msg = JSON.parse(event.data)
            } catch {
                console.warn('[RpcClient] Received non-JSON message:', event.data)
                return
            }

            // ── Handshake confirmation ────────────────────
            if (msg.type === 'CONNECTED') {
                console.log('[RpcClient] Server confirmed connection:', msg.timestamp)
                this._readyResolve?.()
                return
            }

            // ── Server-initiated push (no reqId) ──────────
            if (!msg.reqId) {
                window.dispatchEvent(new CustomEvent('rpc_push', { detail: msg }))
                return
            }

            // ── RPC response (has reqId) ───────────────────
            const pending = this.pendingRequests.get(msg.reqId)
            if (!pending) return

            clearTimeout(pending.timer)
            this.pendingRequests.delete(msg.reqId)

            if (msg.response?.success) {
                pending.resolve(msg.response.data)
            } else {
                pending.reject(new Error(msg.response?.error ?? 'RPC call failed'))
            }
        }

        this.ws.onclose = (event) => {
            this.status = 'closed'
            console.warn(`[RpcClient] Connection closed (code=${event.code}). Reconnecting in 3s…`)
            // Reject all pending requests on disconnect
            for (const [reqId, pending] of this.pendingRequests) {
                clearTimeout(pending.timer)
                pending.reject(new Error('WebSocket connection closed'))
                this.pendingRequests.delete(reqId)
            }
            setTimeout(() => this._connect(), 3000)
        }

        this.ws.onerror = (err) => {
            console.error('[RpcClient] WebSocket error:', err)
        }
    }

    /**
     * Wait until the WebSocket is ready to accept messages.
     * @returns {Promise<void>}
     */
    ready() {
        return this._readyPromise
    }

    /**
     * Send an RPC request and return a Promise that resolves with the server's response data.
     * Rejects if the server returns an error, the connection is closed, or a 30s timeout elapses.
     *
     * @template T
     * @param {string} action  - Command name matching a registry entry (e.g. 'FETCH_DASHBOARD_STATS')
     * @param {any} [payload]  - Optional arguments for the command
     * @returns {Promise<T>}
     */
    async request(action, payload = {}) {
        await this.ready()

        if (this.ws?.readyState !== WebSocket.OPEN) {
            throw new Error('[RpcClient] WebSocket is not open')
        }

        const reqId = crypto.randomUUID()

        const promise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(reqId)
                reject(new Error(`[RpcClient] Request "${action}" timed out after 30s`))
            }, 30_000)

            this.pendingRequests.set(reqId, { resolve, reject, timer })
        })

        this.ws.send(JSON.stringify({ action, payload, reqId }))
        return promise
    }
}

// ── Singleton exposed on window.rpc ────────────────────────
// Alpine.js components and vanilla JS can call `window.rpc.request(...)` directly.
window.rpc = new RpcClient()
