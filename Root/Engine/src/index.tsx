/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import { Home } from '../../Dashboard/src/pages/Home'
import { Login } from '../../Dashboard/src/pages/Login'
import { Register } from '../../Dashboard/src/pages/Register'
import { authRoutes } from './api/auth/index'

import { Index } from '../../Dashboard/src/pages/Index'

// CSS imports (raw text for static serving)
import authCss from '../../Dashboard/src/styles/auth.css'
import mainCss from '../../Dashboard/src/styles/main.css'

const app = new Hono<{ Bindings: Env }>()

// ─── Static Assets ─────────────────────────────────────────

app.get('/styles/auth.css', (c) => {
    return c.text(authCss, 200, { 'Content-Type': 'text/css' })
})

app.get('/styles/main.css', (c) => {
    return c.text(mainCss, 200, { 'Content-Type': 'text/css' })
})

// ─── Landing Page ──────────────────────────────────────────

app.get('/', (c) => {
    return c.html(<Index />)
})

import { getCookie } from 'hono/cookie'

// ─── Dashboard Routes ──────────────────────────────────────

app.get('/dashboard', async (c) => {
    const token = getCookie(c, 'auth_token') || ''

    // We must decode the token to get the tenantId.
    // In a real scenario we'd use verifyToken here. But since this is SSR we'll just parse the payload.
    let tenantId = ''
    try {
        const payloadStr = atob(token.split('.')[1])
        tenantId = JSON.parse(payloadStr).tid
    } catch (e) { /* ignore */ }

    // Obter dados reais das tabelas para o painel BaaS
    let users: any[] = []
    let customers: any[] = []
    let products: any[] = []

    if (tenantId) {
        users = (await c.env.DB.prepare('SELECT id, email, created_at FROM tenant_users WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50').bind(tenantId).all()).results || []
        customers = (await c.env.DB.prepare('SELECT id, name, email, created_at FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50').bind(tenantId).all()).results || []
        products = (await c.env.DB.prepare('SELECT id, name, price, stock, created_at FROM products WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50').bind(tenantId).all()).results || []
    }

    return c.html(<Home token={token} users={users} customers={customers} products={products} />)
})

app.get('/login', (c) => {
    return c.html(<Login />)
})

app.get('/register', (c) => {
    return c.html(<Register />)
})

// ─── API Routes ────────────────────────────────────────────

import { meRoute } from './api/auth/me'
import { endUserAuthRoutes } from './api/v1/auth'
import { customersRoute } from './api/v1/customers'
import { productsRoute } from './api/v1/products'

app.route('/api/auth', authRoutes)
app.route('/api/auth/me', meRoute)
app.route('/api/v1/auth', endUserAuthRoutes)
app.route('/api/v1/customers', customersRoute)
app.route('/api/v1/products', productsRoute)

// HTMX Example API
app.get('/api/hello', (c) => {
    return c.html(<p>Hello from GeniusBase Engine via HTMX!</p>)
})

// ─── Durable Object Exports ────────────────────────────────

export { RealtimeState } from './objects/RealtimeState'

export default app
