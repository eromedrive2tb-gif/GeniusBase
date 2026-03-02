/**
 * GeniusBase Client SDK
 * Root/SDK/src/index.ts
 *
 * Entrypoint principal do SDK. Exporta a função `createClient` que inicializa
 * um cliente tipado para os Tenants consumirem o BaaS.
 *
 * Exemplo de uso:
 * ```typescript
 * import { createClient } from '@geniusbase/sdk'
 *
 * const gb = createClient('https://myproject.workers.dev', 'sk_service_eyJ...')
 *
 * // ── Auth ─────────────────────────────────────────────────
 * const { data: session, error } = await gb.auth.login('user@example.com', 'senha123')
 * if (session) console.log('Token:', session.token)
 *
 * // ── Database ─────────────────────────────────────────────
 * const { data: customers } = await gb.from('customers').select()
 * const { data: newCustomer } = await gb.from('customers').insert({ name: 'Isaac', email: 'hi@gb.dev' })
 *
 * // ── Realtime ─────────────────────────────────────────────
 * gb.channel('notifications')
 *   .on('customer.created', (payload) => console.log('New customer:', payload))
 *   .on('product.updated',  (payload) => console.log('Product updated:', payload))
 *   .subscribe()
 * ```
 */

import { AuthClient } from './auth'
import { DatabaseClient } from './database'
import { RealtimeClient } from './realtime'
import { EventsClient } from './events'
import { PaymentsClient } from './payments'
import { OrdersClient } from './orders'
import { TransactionsClient } from './transactions'

export type { AuthResponse, Session, UserRecord } from './auth'
export type { QueryResponse } from './database'
export type { TrackResponse, EventsResponse } from './events'
export type { ChargeData, ChargeResult } from './payments'
export type { OrderItem, OrderItemResult, CheckoutOptions, CheckoutResult, OrderCheckoutData } from './orders'
export { QueryBuilder, DatabaseClient } from './database'
export { Channel, RealtimeClient } from './realtime'
export { AuthClient } from './auth'
export { EventsClient } from './events'
export { PaymentsClient } from './payments'
export { OrdersClient } from './orders'
export { TransactionsClient } from './transactions'
export type { TransactionCheckoutData } from './transactions'

// ─── GeniusBaseClient ──────────────────────────────────────

class GeniusBaseClient {
    /** Authenticate end-users of your application */
    readonly auth: AuthClient

    /** Access and manipulate your BaaS tables */
    private readonly _db: DatabaseClient

    /** Subscribe to real-time events from your BaaS */
    private readonly _realtime: RealtimeClient

    /** Track custom telemetry events (Igor module) */
    readonly events: EventsClient

    /** Create PIX charges and handle payment events */
    readonly payments: PaymentsClient

    /** Create structured orders (cart → checkout → PIX QR code) */
    readonly orders: OrdersClient

    /** Create standalone transactions (no cart/items) like donations */
    readonly transactions: TransactionsClient

    constructor(baseUrl: string, apiKey: string) {
        // Trim trailing slash for consistent URL construction
        const url = baseUrl.replace(/\/$/, '')

        this.auth = new AuthClient(url, apiKey)
        this._db = new DatabaseClient(url, apiKey)
        this._realtime = new RealtimeClient(url, apiKey)
        this.events = new EventsClient(url, apiKey)
        this.payments = new PaymentsClient(url, apiKey)
        this.orders = new OrdersClient(url, apiKey)
        this.transactions = new TransactionsClient(url, apiKey)
    }

    /**
     * Access a BaaS table for reading and writing.
     *
     * @example
     * const { data } = await gb.from('customers').select()
     * const { data } = await gb.from<Product>('products').insert({ name: 'Widget', price: 999 })
     */
    from<T = Record<string, unknown>>(tableName: string) {
        return this._db.from<T>(tableName)
    }

    /**
     * Create a named Realtime channel and subscribe to server-pushed events.
     *
     * @param name - Logical channel name (for debugging/organisation; currently cosmetic)
     * @example
     * gb.channel('main')
     *   .on('customer.created', handler)
     *   .subscribe()
     */
    channel(name: string) {
        return this._realtime.channel(name)
    }
}

// ─── Public Factory ────────────────────────────────────────

/**
 * Initialize a GeniusBase client instance.
 *
 * @param url    - Base URL of your GeniusBase Worker (e.g. 'https://myproject.workers.dev')
 * @param apiKey - Service API Key generated in the GeniusBase Dashboard (role: service)
 *
 * @example
 * const gb = createClient('https://myproject.workers.dev', process.env.GB_SERVICE_KEY!)
 */
export function createClient(url: string, apiKey: string): GeniusBaseClient {
    return new GeniusBaseClient(url, apiKey)
}
