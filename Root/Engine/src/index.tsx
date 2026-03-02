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
import { internalDashboardRoute } from './api/internal/dashboard'
import { apiKeysRoute } from './api/internal/apikeys'
import { internalRealtimeRoute } from './api/internal/realtime'

// CSS imports (raw text for static serving)
import authCss from '../../Dashboard/src/styles/auth.css'
import mainCss from '../../Dashboard/src/styles/main.css'

// JS script imports (raw text for static serving)
import rpcClientJs from '../../Dashboard/src/scripts/rpcClient.js'

const app = new Hono<{ Bindings: Env }>()

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

// ─── Public BaaS API (End-User / Tenant Service) ───────────
// CORS: Tenant apps run on different origins (e.g. localhost:3000, tenant.com).
// Scoped only to /api/v1/* — internal routes must never emit CORS headers.

app.use('/api/v1/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
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

// ─── HTMX Utility Endpoint ─────────────────────────────────

app.get('/api/hello', (c) => {
    return c.html(<p>Hello from GeniusBase Engine via HTMX!</p>)
})

// ─── Durable Object Exports ────────────────────────────────

export { RealtimeState } from './objects/RealtimeState'
export { DashboardRPCState } from './objects/DashboardRPCState'

export default app
