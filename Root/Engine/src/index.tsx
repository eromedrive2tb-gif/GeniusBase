/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import { Home } from '../../Dashboard/src/pages/Home'

const app = new Hono<{ Bindings: Env }>()

// Dashboard Route
app.get('/', (c) => {
    return c.html(<Home />)
})

// HTMX Example API
app.get('/api/hello', (c) => {
    return c.html(<p>Hello from GeniusBase Engine via HTMX!</p>)
})

// Durable Object class export
export { RealtimeState } from './objects/RealtimeState'

export default app
