/** @jsxImportSource hono/jsx */

/**
 * Page: Home (Dashboard)
 * Root/Dashboard/src/pages/Home.tsx
 *
 * Responsabilidade única: orquestrar a página principal do dashboard
 * compondo o DashboardLayout, DashboardTabs e os Organisms dos painéis.
 */

import { DashboardLayout } from '../components/templates/DashboardLayout'
import { DashboardTabs } from '../components/organisms/DashboardTabs'
import { CoreApisPanel } from '../components/organisms/CoreApisPanel'
import { GatewaysPanel } from '../components/organisms/GatewaysPanel'
import { AuthPanel } from '../components/organisms/AuthPanel'
import { DatabasePanel } from '../components/organisms/DatabasePanel'
import { DocsPanel } from '../components/organisms/DocsPanel'
import { EventsPanel } from '../components/organisms/EventsPanel'
import { OrdersPanel } from '../components/organisms/OrdersPanel'

type HomeProps = {
  users: any[]
  customers: any[]
  products: any[]
  events: any[]
}

export const Home = ({ users, customers, products, events }: HomeProps) => {
  return (
    <DashboardLayout title="Painel — GeniusBase">
      {/* ─── Tabs ─────────────────────────────────── */}
      <DashboardTabs />

      {/* ─── Panels ───────────────────────────────── */}
      <CoreApisPanel />
      <AuthPanel users={users} />
      <DatabasePanel customers={customers} products={products} />
      <EventsPanel events={events} />
      <GatewaysPanel />
      <DocsPanel />
      <OrdersPanel />
    </DashboardLayout>
  )
}
