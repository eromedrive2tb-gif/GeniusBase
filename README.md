# GeniusBase - Multi-Tenant API Aggregator & Payment Gateway

High-performance "mini-supabase" built on Cloudflare Workers (Hono) with HTMX + Alpine.js.

## Architecture Highlights

- **Edge First**: Built for Cloudflare Workers (Hono.js).
- **Architecture**: Separated `Root/Engine` (Backend/EDA) and `Root/Dashboard` (Frontend Atomic Design).
- **Multi-Tenant**: Secure isolation and dynamic API generation.
- **Tech Stack**: 
  - Backend: Hono.js
  - Frontend: HTMX + Alpine.js
  - Database: Cloudflare D1
  - Storage: Cloudflare R2
  - Cache: Cloudflare KV
  - Real-time/Queues: Cloudflare Durable Objects (DO)

## Directory Structure

```text
/Root
  /Engine
    /src
      index.tsx       # Entry point
      /objects        # Durable Objects
  /Dashboard
    /src
      /components     # Atomic Design (Atoms, Molecules, Organisms)
      /pages          # HTMX Rendered Pages
```

## Getting Started

```bash
bun install
bun run dev
```

## Deployment

```bash
bun run deploy
```

## Useful Commands

- `bun run cf-typegen`: Generate Cloudflare environment types.
- `bun run db:migrate`: Apply D1 migrations (local).
