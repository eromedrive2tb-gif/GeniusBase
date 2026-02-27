/** @jsxImportSource hono/jsx */
import { Button } from '../components/atoms/Button'

export const Home = () => {
  return (
    <html>
      <head>
        <title>GeniusBase Dashboard</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
        <style>{`
          .btn-primary { background-color: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; }
        `}</style>
      </head>
      <body>
        <main class="container" x-data="{ count: 0 }">
          <header>
            <h1>GeniusBase Dashboard</h1>
            <p>High-Performance Multi-Tenant Aggregator</p>
          </header>
          
          <section>
            <h2>Alpine.js Interactivity</h2>
            <div x-on:click="count++">
              <Button class="btn-primary">
                Count is: <span x-text="count"></span>
              </Button>
            </div>
          </section>

          <section>
            <h2>HTMX Server Actions</h2>
            <Button 
              class="btn-primary"
              hx-get="/api/hello" 
              hx-target="#htmx-result"
            >
              Fetch message from Engine
            </Button>
            <div id="htmx-result" style="margin-top: 1rem;"></div>
          </section>
        </main>
      </body>
    </html>
  )
}
