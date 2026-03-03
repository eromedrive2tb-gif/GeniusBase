/**
 * Transactions Client — GeniusBase SDK
 * Root/SDK/src/transactions.ts
 *
 * Wrapper para a rota POST /api/v1/transactions do BaaS.
 * Permite que os Tenants gerem Pagamentos Avulsos (doações, depósitos,
 * cobranças sem carrinho), com captura de dados do pagador via webhook.
 */

export interface TransactionCheckoutData {
    transaction_id: string
    provider_transaction_id: string
    amount: number
    status: 'PENDING' | 'COMPLETED' | 'FAILED'
    brCode: string | null
    paymentLinkUrl?: string | null
    payer_name?: string | null
    payer_document?: string | null
    customer_id?: string | null
    metadata?: Record<string, unknown> | null
    created_at?: string
    updated_at?: string
}

export interface CreateTransactionOptions {
    /** Amount in cents (e.g. 10000 = R$ 100,00) */
    amount: number
    /** Payment provider key, e.g. 'openpix' */
    provider: string
    /** Optional end-user ID to associate with the transaction */
    customer_id?: string
    /** Custom JSON data stored with the transaction */
    metadata?: Record<string, unknown>
}

export type TransactionResult = { data: TransactionCheckoutData | null; error: string | null }

export class TransactionsClient {
    private readonly baseUrl: string
    private apiKey: string

    setToken(token: string) {
        this.apiKey = token
    }

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
    }

    /**
     * Creates a standalone PIX transaction (no order/products attached).
     *
     * @returns `{ data }` containing the brCode for QR rendering, or `{ error }`
     */
    async create(opts: CreateTransactionOptions): Promise<TransactionResult> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(opts),
            })

            const json = await res.json() as { success?: boolean; data?: TransactionCheckoutData; error?: string }

            if (!res.ok || !json.success) {
                return { data: null, error: json.error ?? `HTTP ${res.status}` }
            }

            return { data: json.data ?? null, error: null }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return { data: null, error: msg }
        }
    }
}
