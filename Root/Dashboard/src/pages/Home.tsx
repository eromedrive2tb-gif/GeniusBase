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

type HomeProps = {
  token: string
  users: any[]
  customers: any[]
  products: any[]
}

export const Home = ({ token, users, customers, products }: HomeProps) => {
  return (
    <DashboardLayout title="Painel — GeniusBase">
      {/* ─── Tabs ─────────────────────────────────── */}
      <DashboardTabs />

      {/* ─── Panels ───────────────────────────────── */}
      <CoreApisPanel token={token} />
      <AuthPanel users={users} />
      <DatabasePanel customers={customers} products={products} />
      <GatewaysPanel />
      <DocsPanel />
    </DashboardLayout>
  )
}
