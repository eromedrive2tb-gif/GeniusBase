/**
 * GeniusBase SDK — Payments Module
 * Root/SDK/src/payments.ts
 *
 * Responsabilidade única: Wrapper para POST /api/v1/payments/charges.
 * Permite que Tenants criem cobranças PIX sem escrever headers manualmente.
 *
 * Exemplo de uso:
 *   const { data, error } = await gb.payments.createCharge('openpix', 10000, { pedido: '999' })
 *   if (data) renderQRCode(data.brCode)
 */

export interface ChargeData {
    id: string
    provider: string
    provider_charge_id: string
    amount: number
    status: string
    brCode: string | null
    created_at: number
}

export interface ChargeResult {
    data: ChargeData | null
    error: string | null
}

export class PaymentsClient {
    private readonly url: string
    private readonly headers: Record<string, string>

    setToken(token: string) {
        this.headers["Authorization"] = `Bearer ${token}`
    }

    constructor(baseUrl: string, apiKey: string) {
        this.url = `${baseUrl}/api/v1/payments/charges`
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    /**
     * Creates a PIX charge via the GeniusBase agnostic payment engine.
     * The tenant's gateway credentials are resolved server-side from D1.
     *
     * @param provider - Gateway provider name, e.g. 'openpix'
     * @param amount   - Amount in cents, e.g. 10000 = R$100,00
     * @param metadata - Optional arbitrary JSON for tracking (e.g. cart ID, order ID)
     *
     * @example
     * const { data, error } = await gb.payments.createCharge('openpix', 10000, { cart: '123' })
     * if (data?.brCode) showQRCode(data.brCode)
     */
    async createCharge(
        provider: string,
        amount: number,
        metadata?: Record<string, unknown>
    ): Promise<ChargeResult> {
        try {
            const res = await fetch(this.url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ provider, amount, metadata: metadata ?? {} }),
            })
            if (!res.ok) {
                const body = await res.text()
                return { data: null, error: body }
            }
            const json = (await res.json()) as { success: boolean; data: ChargeData }
            return { data: json.data, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }
}
