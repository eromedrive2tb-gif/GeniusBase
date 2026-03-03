/**
 * Event Handler: PaymentEventHandler
 * Root/Engine/src/domain/events/PaymentEventHandler.ts
 */

import { D1Database } from '@cloudflare/workers-types'
import { TransactionRepository } from '../repositories/TransactionRepository'
import { OrderRepository } from '../repositories/OrderRepository'
import { CustomerRepository } from '../repositories/CustomerRepository'

export interface PayerData {
    name?: string
    document?: string
    email?: string
}

export class PaymentEventHandler {
    static async processSuccess(env: any, providerChargeId: string, payerData: PayerData, providerName: string) {
        const db: D1Database = env.DB
        const now = new Date().toISOString()

        // 1. Find the transaction
        const txn = await TransactionRepository.findByProviderId(db, providerChargeId)
        if (!txn) return

        // 2. Passive CRM Capture
        let finalCustomerId = txn.customer_id
        if (!finalCustomerId && payerData.document) {
            const existingCustomer = await CustomerRepository.findByIdentifier(db, txn.tenant_id, payerData.document, payerData.email)
            if (existingCustomer) {
                finalCustomerId = existingCustomer.id
            } else {
                const newCustomerId = `cus_${crypto.randomUUID().replace(/-/g, '')}`
                await CustomerRepository.create(db, {
                    id: newCustomerId,
                    tenantId: txn.tenant_id,
                    name: payerData.name ?? 'Cliente Anônimo',
                    document: payerData.document,
                    email: payerData.email
                })
                finalCustomerId = newCustomerId
            }
        }

        // 3. Update Transaction and Order atomically if possible, or sequentially via Repository
        const statements = [
            db.prepare(
                `UPDATE tenant_transactions SET status = 'COMPLETED', payer_name = ?, payer_document = ?, customer_id = ? WHERE id = ?`
            ).bind(payerData.name ?? null, payerData.document ?? null, finalCustomerId, txn.id)
        ]

        if (txn.order_id) {
            statements.push(
                db.prepare(`UPDATE tenant_orders SET status = 'PAID', updated_at = ?, customer_id = ? WHERE id = ?`).bind(now, finalCustomerId, txn.order_id)
            )
        }

        await db.batch(statements)

        // 4. Broadcast Events
        await this.broadcastEvents(env, txn, payerData, providerName, providerChargeId, finalCustomerId, now)
    }

    private static async broadcastEvents(env: any, txn: any, payerData: PayerData, providerName: string, providerChargeId: string, customerId: string | null, now: string) {
        const trxPayload = {
            transaction_id: txn.id,
            tenant_id: txn.tenant_id,
            order_id: txn.order_id,
            amount: txn.amount,
            status: 'COMPLETED',
            provider: providerName,
            payer_name: payerData.name,
            payer_document: payerData.document,
            updated_at: now,
        }

        // Broadcast to Realtime and Dashboard
        try {
            const realtimeId = env.REALTIME_STATE.idFromName(txn.tenant_id)
            await env.REALTIME_STATE.get(realtimeId).broadcast(
                JSON.stringify({ type: 'PUSH', event: 'TRANSACTION_COMPLETED', payload: trxPayload })
            )
        } catch { }

        try {
            const dashboardId = env.DASHBOARD_RPC_STATE.idFromName(txn.tenant_id)
            await env.DASHBOARD_RPC_STATE.get(dashboardId).push('TRANSACTION_COMPLETED', trxPayload)
        } catch { }

        if (txn.order_id) {
            // Fetch item count for the dashboard
            const { results } = await env.DB.prepare(
                `SELECT count(*) as count FROM tenant_order_items WHERE order_id = ?`
            ).bind(txn.order_id).all()
            const itemCount = (results[0] as any)?.count || 0

            const orderPayload = {
                ...trxPayload,
                total_amount: txn.amount, // Rename to total_amount for OrdersPanel
                status: 'PAID',
                provider_transaction_id: providerChargeId,
                item_count: itemCount
            }

            try {
                const realtimeId = env.REALTIME_STATE.idFromName(txn.tenant_id)
                await env.REALTIME_STATE.get(realtimeId).broadcast(
                    JSON.stringify({ type: 'PUSH', event: 'ORDER_PAID', payload: orderPayload })
                )
            } catch { }

            try {
                const dashboardId = env.DASHBOARD_RPC_STATE.idFromName(txn.tenant_id)
                await env.DASHBOARD_RPC_STATE.get(dashboardId).push('ORDER_PAID', orderPayload)
            } catch { }
        }
    }

    static async processFailure(db: D1Database, providerChargeId: string) {
        const now = new Date().toISOString()
        await db.batch([
            db.prepare(`UPDATE tenant_transactions SET status = 'FAILED', updated_at = ? WHERE provider_transaction_id = ?`).bind(now, providerChargeId),
            db.prepare(`UPDATE tenant_charges SET status = 'FAILED', updated_at = ? WHERE provider_charge_id = ?`).bind(now, providerChargeId),
        ])
    }
}
