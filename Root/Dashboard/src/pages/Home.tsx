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
import { DocsPanel } from '../components/organisms/DocsPanel'

export const Home = () => {
  return (
    <DashboardLayout title="Painel — GeniusBase">
      {/* ─── Tabs ─────────────────────────────────── */}
      <DashboardTabs />

      {/* ─── Panels ───────────────────────────────── */}
      <CoreApisPanel />
      <GatewaysPanel />
      <DocsPanel />
    </DashboardLayout>
  )
}
