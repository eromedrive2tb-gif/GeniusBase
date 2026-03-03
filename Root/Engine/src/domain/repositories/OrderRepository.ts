/**
 * Repository: OrderRepository
 * Root/Engine/src/domain/repositories/OrderRepository.ts
 */

import { D1Database } from '@cloudflare/workers-types'
import { BadRequestError, NotFoundError } from '../errors'

export interface OrderItem {
    product_id: string
    quantity: number
}

export interface CreateOrderParams {
    tenantId: string
    customerId: string | null
    items: OrderItem[]
    metadata: any
    provider: string
}

export class OrderRepository {
    static async validateStockAndGetPrices(db: D1Database, tenantId: string, items: OrderItem[]) {
        const priceMap = new Map<string, number>()
        for (const item of items) {
            const row = await db.prepare(
                `SELECT id, price, stock FROM products WHERE id = ? AND tenant_id = ?`
            ).bind(item.product_id, tenantId).first<{ id: string; price: number; stock: number }>()

            if (!row) throw new NotFoundError(`Product "${item.product_id}" not found`, 'PRODUCT_NOT_FOUND')
            if (row.stock < item.quantity) throw new BadRequestError(`Out of stock: ${row.id}`, 'OUT_OF_STOCK')

            priceMap.set(item.product_id, row.price)
        }
        return priceMap
    }

    static async createOrderBatch(db: D1Database, params: {
        orderId: string
        txnId: string
        tenantId: string
        customerId: string | null
        totalAmount: number
        metadata: any
        items: OrderItem[]
        priceMap: Map<string, number>
        provider: string
        providerChargeId: string
    }) {
        const now = new Date().toISOString()
        const orderMetadataRaw = params.metadata ? JSON.stringify(params.metadata) : null
        const txnMetadataJson = JSON.stringify({ items: params.items })

        const itemStatements = params.items.map((item) => {
            const itemId = `oi_${crypto.randomUUID().replace(/-/g, '')}`
            return db.prepare(
                `INSERT INTO tenant_order_items (id, order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)`
            ).bind(itemId, params.orderId, item.product_id, item.quantity, params.priceMap.get(item.product_id) ?? 0)
        })

        const stockStatements = params.items.map((item) => {
            return db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?`).bind(item.quantity, item.product_id, params.tenantId)
        })

        return db.batch([
            ...stockStatements,
            db.prepare(
                `INSERT INTO tenant_orders (id, tenant_id, customer_id, status, total_amount, metadata, created_at, updated_at) VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?)`
            ).bind(params.orderId, params.tenantId, params.customerId, params.totalAmount, orderMetadataRaw, now, now),
            ...itemStatements,
            db.prepare(
                `INSERT INTO tenant_transactions (id, tenant_id, order_id, provider, provider_transaction_id, amount, payment_method, status, metadata, created_at, customer_id) VALUES (?, ?, ?, ?, ?, ?, 'PIX', 'PENDING', ?, ?, ?)`
            ).bind(params.txnId, params.tenantId, params.orderId, params.provider, params.providerChargeId, params.totalAmount, txnMetadataJson, now, params.customerId),
        ])
    }

    static async findById(db: D1Database, tenantId: string, orderId: string) {
        const order = await db.prepare(
            `SELECT o.*, COALESCE(t.payment_method, 'PIX') AS payment_method, COALESCE(t.status, 'PENDING') AS transaction_status
             FROM tenant_orders o
             LEFT JOIN tenant_transactions t ON t.order_id = o.id
             WHERE o.id = ? AND o.tenant_id = ?`
        ).bind(orderId, tenantId).first<any>()

        if (!order) return null

        const { results: items } = await db.prepare(
            `SELECT product_id, quantity, price_at_time FROM tenant_order_items WHERE order_id = ?`
        ).bind(orderId).all()

        return { ...order, items }
    }
}
