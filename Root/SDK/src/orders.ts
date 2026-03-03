/**
 * Orders Client — GeniusBase SDK
 * Root/SDK/src/orders.ts
 *
 * Wrapper para a rota POST /api/v1/orders do BaaS.
 * Permite que os Tenants criem checkouts completos (order + PIX) com um único
 * método, sem expor detalhes de gateway, credenciais ou preços ao frontend.
 *
 * Uso:
 *   const { data, error } = await gb.orders.checkout({
 *     items:    [{ product_id: 'prod_123', quantity: 2 }],
 *     provider: 'openpix',
 *   })
 *   if (data?.brCode) renderQRCode(data.brCode)
 *
 *   gb.channel('loja').on('ORDER_PAID', (order) => mostrarSucesso(order))
 */

export interface OrderItem {
    product_id: string
    quantity: number
}

export interface OrderItemResult extends OrderItem {
    price_at_time: number  // cents — server-authoritative price at checkout
}

export interface OrderCheckoutData {
    order_id: string
    transaction_id: string
    provider: string
    provider_transaction_id: string
    total_amount: number    // cents
    status: 'PENDING' | 'PAID' | 'FAILED'
    brCode: string | null  // Pix Copia e Cola
    paymentLinkUrl?: string | null
    customer_id?: string | null
    metadata?: Record<string, any>
    items: OrderItemResult[]
    created_at: string
}

export interface CheckoutOptions {
    /** Line items to include in the order */
    items: OrderItem[]
    /** Payment provider key, e.g. 'openpix' */
    provider: string
    /** Optional end-user ID to associate with the order */
    customer_id?: string
    /** Optional metadata payload for the order (e.g. table number, notes) */
    metadata?: Record<string, any>
}

export type CheckoutResult = { data: OrderCheckoutData | null; error: string | null }

export class OrdersClient {
    private readonly baseUrl: string
    private apiKey: string

    setToken(token: string) {
        this.apiKey = token
    }

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
    }

    /**
     * Creates a full e-commerce order (products → calculated total → PIX charge).
     *
     * Prices are ALWAYS validated server-side — never send prices from the frontend.
     *
     * @returns `{ data }` on success with `brCode` for QR rendering, or `{ error }` on failure.
     *
     * @example
     * const { data, error } = await gb.orders.checkout({
     *   items:    [{ product_id: 'prod_abc', quantity: 1 }],
     *   provider: 'openpix',
     * })
     * if (data) showQR(data.brCode)
     *
     * gb.channel('loja').on('ORDER_PAID', (order) => releaseDownload(order))
     */
    async checkout(opts: CheckoutOptions): Promise<CheckoutResult> {
        try {
            const idempotencyKey = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `gb-fallback-${Date.now()}-${Math.random()}`

            const res = await fetch(`${this.baseUrl}/api/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Idempotency-Key': idempotencyKey,
                },
                body: JSON.stringify(opts),
            })

            const json = await res.json() as { success?: boolean; data?: OrderCheckoutData; error?: string }

            if (!res.ok || !json.success) {
                return { data: null, error: json.error ?? `HTTP ${res.status}` }
            }

            return { data: json.data ?? null, error: null }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return { data: null, error: msg }
        }
    }

    /**
     * Fetch the current status and details of an order.
     * Useful for polling or recovering state if a WebSocket disconnects.
     * Calls GET /api/v1/orders/:id
     */
    async getStatus(orderId: string): Promise<{ data: OrderCheckoutData | null; error: string | null }> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            })
            const json = await res.json() as { success?: boolean; data?: OrderCheckoutData; error?: string }
            if (!res.ok || !json.success) {
                return { data: null, error: json.error ?? `HTTP ${res.status}` }
            }
            return { data: json.data ?? null, error: null }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return { data: null, error: msg }
        }
    }
}
