/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import { Home } from '../../Dashboard/src/pages/Home'
import { Login } from '../../Dashboard/src/pages/Login'
import { Register } from '../../Dashboard/src/pages/Register'
import { authRoutes } from './api/auth/index'

// CSS imports (raw text for static serving)
import authCss from '../../Dashboard/src/styles/auth.css'

const app = new Hono<{ Bindings: Env }>()

// ─── Static Assets ─────────────────────────────────────────

app.get('/styles/auth.css', (c) => {
    return c.text(authCss, 200, { 'Content-Type': 'text/css' })
})

// ─── Dashboard Routes ──────────────────────────────────────

app.get('/', (c) => {
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
