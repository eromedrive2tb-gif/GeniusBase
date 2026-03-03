/**
 * Repository: TransactionRepository
 * Root/Engine/src/domain/repositories/TransactionRepository.ts
 */

import { D1Database } from '@cloudflare/workers-types'

export class TransactionRepository {
    static async createStandalone(db: D1Database, params: {
        id: string
        tenantId: string
        provider: string
        providerTxnId: string
        amount: number
        metadata: string | null
        customerId: string | null
    }) {
        return db.prepare(
            `INSERT INTO tenant_transactions 
                (id, tenant_id, order_id, provider, provider_transaction_id, amount, payment_method, status, metadata, customer_id, created_at)
             VALUES (?, ?, NULL, ?, ?, ?, 'PIX', 'PENDING', ?, ?, ?)`
        ).bind(
            params.id,
            params.tenantId,
            params.provider,
            params.providerTxnId,
            params.amount,
            params.metadata,
            params.customerId,
            new Date().toISOString()
        ).run()
    }

    static async findByProviderId(db: D1Database, providerTxnId: string) {
        return db.prepare(
            `SELECT id, tenant_id, order_id, amount, customer_id
             FROM tenant_transactions
             WHERE provider_transaction_id = ? AND status = 'PENDING'
             LIMIT 1`
        ).bind(providerTxnId).first<any>()
    }

    static async updateStatus(db: D1Database, params: {
        id: string
        status: string
        payer_name?: string
        payer_document?: string
        customer_id?: string | null
    }) {
        return db.prepare(
            `UPDATE tenant_transactions 
             SET status = ?, payer_name = ?, payer_document = ?, customer_id = ?
             WHERE id = ?`
        ).bind(params.status, params.payer_name ?? null, params.payer_document ?? null, params.customer_id ?? null, params.id).run()
    }
}
