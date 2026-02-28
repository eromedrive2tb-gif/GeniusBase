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

// ─── Dashboard Routes ──────────────────────────────────────

app.get('/dashboard', (c) => {
    return c.html(<Home />)
})

app.get('/login', (c) => {
    return c.html(<Login />)
})

app.get('/register', (c) => {
    return c.html(<Register />)
})

// ─── API Routes ────────────────────────────────────────────

app.route('/api/auth', authRoutes)

// HTMX Example API
app.get('/api/hello', (c) => {
    return c.html(<p>Hello from GeniusBase Engine via HTMX!</p>)
})

// ─── Durable Object Exports ────────────────────────────────

export { RealtimeState } from './objects/RealtimeState'

export default app
