.
|-- bun.lock
|-- package.json
|-- README.md
|-- Root
|   |-- Dashboard
|   |   `-- src
|   |       |-- components
|   |       |   |-- atoms
|   |       |   |   |-- Alert.tsx
|   |       |   |   |-- Badge.tsx
|   |       |   |   |-- Button.tsx
|   |       |   |   |-- CodeBlock.tsx
|   |       |   |   |-- Input.tsx
|   |       |   |   |-- Label.tsx
|   |       |   |   `-- Spinner.tsx
|   |       |   |-- molecules
|   |       |   |   |-- AccordionItem.tsx
|   |       |   |   |-- FormField.tsx
|   |       |   |   `-- PasswordField.tsx
|   |       |   |-- organisms
|   |       |   |   |-- AuthPanel.tsx
|   |       |   |   |-- CoreApisPanel.tsx
|   |       |   |   |-- DashboardTabs.tsx
|   |       |   |   |-- DatabasePanel.tsx
|   |       |   |   |-- DocsPanel.tsx
|   |       |   |   |-- EventsPanel.tsx
|   |       |   |   |-- GatewaysPanel.tsx
|   |       |   |   |-- LoginForm.tsx
|   |       |   |   |-- OrdersPanel.tsx
|   |       |   |   `-- RegisterForm.tsx
|   |       |   `-- templates
|   |       |       |-- AuthLayout.tsx
|   |       |       `-- DashboardLayout.tsx
|   |       |-- data
|   |       |   `-- apiDocs.ts
|   |       |-- pages
|   |       |   |-- Home.tsx
|   |       |   |-- Index.tsx
|   |       |   |-- Login.tsx
|   |       |   `-- Register.tsx
|   |       |-- scripts
|   |       |   `-- rpcClient.js
|   |       `-- styles
|   |           |-- auth.css
|   |           `-- main.css
|   |-- Engine
|   |   |-- 0007_ecommerce_core.sql
|   |   `-- src
|   |       |-- api
|   |       |   |-- auth
|   |       |   |   |-- index.ts
|   |       |   |   |-- login.ts
|   |       |   |   |-- logout.ts
|   |       |   |   |-- me.ts
|   |       |   |   `-- register.ts
|   |       |   |-- internal
|   |       |   |   |-- apikeys.tsx
|   |       |   |   |-- dashboard.tsx
|   |       |   |   `-- realtime.ts
|   |       |   `-- v1
|   |       |       |-- auth
|   |       |       |   |-- index.ts
|   |       |       |   |-- login.ts
|   |       |       |   `-- register.ts
|   |       |       |-- customers
|   |       |       |   `-- index.ts
|   |       |       |-- events.ts
|   |       |       |-- orders.ts
|   |       |       |-- payments.ts
|   |       |       |-- products
|   |       |       |   `-- index.ts
|   |       |       |-- realtime
|   |       |       |   `-- index.ts
|   |       |       `-- transactions.ts
|   |       |-- db
|   |       |   `-- migrations
|   |       |       |-- 0001_auth_schema.sql
|   |       |       |-- 0002_core_schema.sql
|   |       |       |-- 0003_enduser_auth_schema.sql
|   |       |       |-- 0004_events_schema.sql
|   |       |       |-- 0005_payments_schema.sql
|   |       |       |-- 0006_tenant_gateways.sql
|   |       |       `-- 0008_standalone_transactions.sql
|   |       |-- events
|   |       |   `-- authEvents.ts
|   |       |-- index.tsx
|   |       |-- middlewares
|   |       |   |-- adminAuth.ts
|   |       |   `-- apiKeyAuth.ts
|   |       |-- objects
|   |       |   |-- DashboardRPCState.ts
|   |       |   `-- RealtimeState.ts
|   |       |-- payments
|   |       |   |-- providers
|   |       |   |   `-- openpix.ts
|   |       |   |-- registry.ts
|   |       |   `-- types.ts
|   |       |-- rpc
|   |       |   `-- registry.ts
|   |       |-- types
|   |       |   |-- auth.ts
|   |       |   `-- modules.d.ts
|   |       `-- utils
|   |           |-- crypto.ts
|   |           |-- htmlFragments.ts
|   |           `-- token.ts
|   |-- Playground
|   |   |-- index.html
|   |   |-- README.md
|   |   `-- SDK -> ../SDK
|   `-- SDK
|       |-- dist
|       |   |-- auth.d.ts
|       |   |-- auth.d.ts.map
|       |   |-- database.d.ts
|       |   |-- database.d.ts.map
|       |   |-- events.d.ts
|       |   |-- events.d.ts.map
|       |   |-- index.cjs
|       |   |-- index.d.ts
|       |   |-- index.d.ts.map
|       |   |-- index.js
|       |   |-- orders.d.ts
|       |   |-- orders.d.ts.map
|       |   |-- payments.d.ts
|       |   |-- payments.d.ts.map
|       |   |-- realtime.d.ts
|       |   |-- realtime.d.ts.map
|       |   |-- transactions.d.ts
|       |   `-- transactions.d.ts.map
|       |-- package.json
|       |-- src
|       |   |-- auth.ts
|       |   |-- database.ts
|       |   |-- events.ts
|       |   |-- index.ts
|       |   |-- orders.ts
|       |   |-- payments.ts
|       |   |-- realtime.ts
|       |   |-- transactions.ts
|       |   `-- types
|       |       `-- browser.d.ts
|       `-- tsconfig.build.json
|-- tree.md
|-- tsconfig.json
|-- worker-configuration.d.ts
`-- wrangler.toml

39 directories, 109 files
