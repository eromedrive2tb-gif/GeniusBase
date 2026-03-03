/** @jsxImportSource hono/jsx */

/**
 * Root Worker Entry Point
 * Root/Engine/src/index.tsx
 *
 * Responsabilidade única: Orquestrar rotas e montar sub-roteadores.
 * Nenhuma lógica de negócio, queries de banco ou parsing de tokens aqui.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { Login } from '../../Dashboard/src/pages/Login'
import { Register } from '../../Dashboard/src/pages/Register'
import { Index } from '../../Dashboard/src/pages/Index'
import { authRoutes } from './api/auth/index'
import { meRoute } from './api/auth/me'
import { endUserAuthRoutes } from './api/v1/auth'
import { customersRoute } from './api/v1/customers'
import { productsRoute } from './api/v1/products'
import { realtimeRoute } from './api/v1/realtime'
import { eventsRoute } from './api/v1/events'
import { paymentsRoute } from './api/v1/payments'
import { ordersRoute } from './api/v1/orders'
import { transactionsRoute } from './api/v1/transactions'
import { storageRoute } from './api/v1/storage'
import { internalDashboardRoute } from './api/internal/dashboard'
import { apiKeysRoute } from './api/internal/apikeys'
import { internalRealtimeRoute } from './api/internal/realtime'
import { internalStorageRoute } from './api/internal/storage'
import { WebhookDispatcher } from './domain/events/WebhookDispatcher'
import { DomainError } from './domain/errors'

// CSS imports (raw text for static serving)
import authCss from '../../Dashboard/src/styles/auth.css'
import mainCss from '../../Dashboard/src/styles/main.css'

// JS script imports (raw text for static serving)
import rpcClientJs from '../../Dashboard/src/scripts/rpcClient.js'

const app = new Hono<{ Bindings: Env }>()

// ─── Global Error Boundary ─────────────────────────────────

app.onError((err, c) => {
    // 1. Handle Zod Validation Errors
    if (err instanceof z.ZodError) {
        return c.json({
            error: {
                message: 'Invalid request payload',
                code: 'VALIDATION_ERROR',
                details: err.issues
            }
        }, 400)
    }

    // 2. Handle Domain Errors (Known)
    if (err instanceof DomainError) {
        return c.json({
            error: {
                message: err.message,
                code: err.code
            }
        }, err.statusCode as any)
    }

    // 2. Handle Unknown Errors (Crashes)
    console.error('[GlobalError] Unhandled Exception:', err)

    // Check if it's a D1 error or something else that we want to gently mask
    return c.json({
        error: {
            message: 'Internal Server Error',
            code: 'INTERNAL_SERVER_ERROR'
        }
    }, 500)
})

app.notFound((c) => {
    return c.json({
        error: {
            message: `Route not found: ${c.req.path}`,
            code: 'NOT_FOUND'
        }
    }, 404)
})

// ─── Static Assets ─────────────────────────────────────────

app.get('/styles/auth.css', (c) => {
    return c.text(authCss, 200, { 'Content-Type': 'text/css' })
})

app.get('/styles/main.css', (c) => {
    return c.text(mainCss, 200, { 'Content-Type': 'text/css' })
})

app.get('/scripts/rpcClient.js', (c) => {
    return c.text(rpcClientJs, 200, { 'Content-Type': 'application/javascript; charset=utf-8' })
})

// ─── Landing Page ──────────────────────────────────────────

app.get('/', (c) => {
    return c.html(<Index />)
})

// ─── Auth Pages (public) ───────────────────────────────────

app.get('/login', (c) => {
    return c.html(<Login />)
})

app.get('/register', (c) => {
    return c.html(<Register />)
})

// ─── Dashboard (Protected SSR) ─────────────────────────────
// adminAuth middleware is enforced inside internalDashboardRoute.
// No JWT parsing, no atob(), no raw DB queries in this file.

app.route('/dashboard', internalDashboardRoute)

// ─── Internal Admin API (Dashboard WebSocket RPC + Auth) ──

app.route('/api/auth', authRoutes)
app.route('/api/auth/me', meRoute)
app.route('/api/internal/apikeys', apiKeysRoute)
app.route('/api/internal/realtime', internalRealtimeRoute)
app.route('/api/internal/storage', internalStorageRoute)

// ─── Public BaaS API (End-User / Tenant Service) ───────────
// CORS: Tenant apps run on different origins (e.g. localhost:3000, tenant.com).
// Scoped only to /api/v1/* — internal routes must never emit CORS headers.

app.use('/api/v1/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-GeniusBase-Event'],
    exposeHeaders: ['Content-Type'],
    maxAge: 86400,
}))

app.route('/api/v1/auth', endUserAuthRoutes)
app.route('/api/v1/customers', customersRoute)
app.route('/api/v1/products', productsRoute)
app.route('/api/v1/events', eventsRoute)
app.route('/api/v1/payments', paymentsRoute)
app.route('/api/v1/orders', ordersRoute)
app.route('/api/v1/transactions', transactionsRoute)
app.route('/api/v1/realtime', realtimeRoute)
app.route('/api/v1/storage', storageRoute)

// ─── HTMX Utility Endpoint ─────────────────────────────────

app.get('/api/hello', (c) => {
    return c.html(<p>Hello from GeniusBase Engine via HTMX!</p>)
})

// ─── Durable Object Exports ────────────────────────────────

export { RealtimeState } from './objects/RealtimeState'
export { DashboardRPCState } from './objects/DashboardRPCState'

export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Env, ctx: ExecutionContext) {
        // Find orders older than 1 hour (3600 seconds) that are still PENDING
        const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString()

        try {
            // Get expired orders
            const { results: expiredOrders } = await env.DB.prepare(
                `SELECT id, tenant_id FROM tenant_orders WHERE status = 'PENDING' AND created_at < ?`
            ).bind(oneHourAgo).all<{ id: string; tenant_id: string }>()

            if (!expiredOrders || expiredOrders.length === 0) {
                return
            }

            for (const order of expiredOrders) {
                // Get items for the order
                const { results: items } = await env.DB.prepare(
                    `SELECT product_id, quantity FROM tenant_order_items WHERE order_id = ?`
                ).bind(order.id).all<{ product_id: string; quantity: number }>()

                if (items && items.length > 0) {
                    // Update order status to EXPIRED
                    const statements = [
                        env.DB.prepare(
                            `UPDATE tenant_orders SET status = 'EXPIRED', updated_at = ? WHERE id = ?`
                        ).bind(new Date().toISOString(), order.id)
                    ]

                    // Increment stock for each item back iteratively
                    for (const item of items) {
                        statements.push(
                            env.DB.prepare(
                                `UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ?`
                            ).bind(item.quantity, item.product_id, order.tenant_id)
                        )
                    }

                    // Execute batch atomically for each order
                    await env.DB.batch(statements)
                    console.log(`[Cron] Expired order ${order.id} and restored stock for ${items.length} items.`)
                } else {
                    // Even if no items, mark it expired
                    await env.DB.prepare(
                        `UPDATE tenant_orders SET status = 'EXPIRED', updated_at = ? WHERE id = ?`
                    ).bind(new Date().toISOString(), order.id).run()
                }

                // Disparar Webhook OMNI
                ctx.waitUntil(WebhookDispatcher.dispatch(env, order.tenant_id, 'ORDER_EXPIRED', {
                    order_id: order.id,
                    status: 'EXPIRED',
                    timestamp: new Date().toISOString()
                }))
            }

            // Also expire Standalone Transactions
            const { results: expiredTxns } = await env.DB.prepare(
                `SELECT id, tenant_id FROM tenant_transactions WHERE status = 'PENDING' AND created_at < ? AND order_id IS NULL`
            ).bind(oneHourAgo).all<{ id: string; tenant_id: string }>()

            if (expiredTxns && expiredTxns.length > 0) {
                for (const txn of expiredTxns) {
                    await env.DB.prepare(
                        `UPDATE tenant_transactions SET status = 'EXPIRED' WHERE id = ?`
                    ).bind(txn.id).run()

                    ctx.waitUntil(WebhookDispatcher.dispatch(env, txn.tenant_id, 'TRANSACTION_EXPIRED', {
                        transaction_id: txn.id,
                        status: 'EXPIRED',
                        timestamp: new Date().toISOString()
                    }))
                }
                console.log(`[Cron] Expired ${expiredTxns.length} standalone transactions.`)
            }

        } catch (error) {
            console.error('[Cron] Error processing expired orders/transactions:', error)
        }
    }
}
