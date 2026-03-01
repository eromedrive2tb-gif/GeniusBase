/**
 * GeniusBase SDK — Igor Events Module
 * Root/SDK/src/events.ts
 *
 * Responsabilidade única: Wrapper para o endpoint POST /api/v1/events.
 * Permite que Tenants disparem eventos customizados de telemetria
 * sem escrever headers de autorização manualmente.
 *
 * Exemplo de uso:
 *   const { data, error } = await gb.events.track('Compra PIX', { valor: 150 })
 */

export interface TrackResponse {
    id: string
    tenant_id: string
    name: string
    payload: Record<string, unknown>
    created_at: number
}

export interface EventsResponse<T> {
    data: T | null
    error: string | null
}

export class EventsClient {
    private readonly url: string
    private readonly headers: Record<string, string>

    constructor(baseUrl: string, apiKey: string) {
        this.url = `${baseUrl}/api/v1/events`
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    /**
     * Track a custom event — persists in D1 and notifies the admin Dashboard
     * in real time via WebSocket broadcast.
     *
     * @param name    - Human-readable event name, e.g. 'Compra PIX'
     * @param payload - Optional arbitrary JSON payload, e.g. { valor: 150.00, metodo: 'pix' }
     *
     * @example
     * const { data, error } = await gb.events.track('Novo Cadastro', { plano: 'pro' })
     */
    async track(
        name: string,
        payload?: Record<string, unknown>
    ): Promise<EventsResponse<TrackResponse>> {
        try {
            const res = await fetch(this.url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ name, payload: payload ?? {} }),
            })
            if (!res.ok) return { data: null, error: await res.text() }
            const body = (await res.json()) as { success: boolean; data: TrackResponse }
            return { data: body.data, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }
}
