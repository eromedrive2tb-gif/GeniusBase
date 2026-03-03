/**
 * Repository: CustomerRepository
 * Root/Engine/src/domain/repositories/CustomerRepository.ts
 */

import { D1Database } from '@cloudflare/workers-types'

export class CustomerRepository {
    static async findById(db: D1Database, id: string, tenantId: string) {
        return db.prepare(`SELECT id FROM customers WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).first()
    }

    static async findByIdentifier(db: D1Database, tenantId: string, document?: string, email?: string) {
        return db.prepare(
            `SELECT id FROM customers WHERE tenant_id = ? AND (document = ? OR email = ?)`
        ).bind(tenantId, document ?? null, email ?? null).first<{ id: string }>()
    }

    static async create(db: D1Database, params: {
        id: string
        tenantId: string
        name: string
        document?: string
        email?: string
    }) {
        const now = new Date().toISOString()
        return db.prepare(
            `INSERT INTO customers (id, tenant_id, name, document, email, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(params.id, params.tenantId, params.name, params.document ?? null, params.email ?? null, now).run()
    }
}
