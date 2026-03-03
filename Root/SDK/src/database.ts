/**
 * GeniusBase SDK — Database Query Builder
 * Root/SDK/src/database.ts
 *
 * Responsabilidade única: Fornecer uma Fluent API para leitura e escrita
 * nas tabelas RESTful expostas pelo BaaS (/api/v1/<table>).
 *
 * Exemplo de uso:
 *   const { data, error } = await gb.from('customers').select()
 *   const { data, error } = await gb.from('customers').insert({ name: 'Isaac', email: 'hi@gb.dev' })
 */

export interface QueryResponse<T> {
    data: T | null
    error: string | null
}

/**
 * A lightweight query builder returned by `gb.from(tableName)`.
 * Chains `.select()` or `.insert(data)` to execute the operation.
 */
export class QueryBuilder<T = Record<string, unknown>> {
    private readonly url: string
    private readonly headers: Record<string, string>
    private queryLimit?: number
    private queryOffset?: number
    private matchId?: string

    constructor(url: string, headers: Record<string, string>) {
        this.url = url
        this.headers = headers
    }

    limit(amount: number): this {
        this.queryLimit = amount
        return this
    }

    offset(amount: number): this {
        this.queryOffset = amount
        return this
    }

    eq(column: string, value: string): this {
        if (column === 'id') {
            this.matchId = value
        }
        return this
    }

    private buildUrl(): string {
        const queryParams = new URLSearchParams()
        if (this.queryLimit !== undefined) queryParams.append('limit', this.queryLimit.toString())
        if (this.queryOffset !== undefined) queryParams.append('offset', this.queryOffset.toString())
        const qs = queryParams.toString()
        return qs ? `${this.url}?${qs}` : this.url
    }

    /**
     * Fetch all rows from the table (GET /api/v1/<table>).
     */
    async select(): Promise<QueryResponse<T[]>> {
        try {
            const res = await fetch(this.buildUrl(), { method: 'GET', headers: this.headers })
            if (!res.ok) return { data: null, error: await res.text() }
            const json = await res.json() as unknown
            const rows = (Array.isArray(json) ? json
                : Array.isArray((json as Record<string, unknown>)?.data)
                    ? (json as Record<string, unknown>).data
                    : json) as T[]
            return { data: rows, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }

    /**
     * Insert a new row (POST /api/v1/<table>).
     */
    async insert(payload: Partial<T>): Promise<QueryResponse<T>> {
        try {
            const res = await fetch(this.url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload),
            })
            if (!res.ok) return { data: null, error: await res.text() }
            const json = await res.json() as any
            return { data: json.data || json, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }

    /**
     * Update an existing row (PATCH /api/v1/<table>/:id).
     * Requirements: Must chain .eq('id', 'value') before calling.
     */
    async update(payload: Partial<T>): Promise<QueryResponse<T>> {
        if (!this.matchId) return { data: null, error: '.eq("id", value) is required for update()' }
        try {
            const res = await fetch(`${this.url}/${this.matchId}`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(payload),
            })
            if (!res.ok) return { data: null, error: await res.text() }
            const json = await res.json() as any
            return { data: json.data || json, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }

    /**
     * Soft delete an existing row (DELETE /api/v1/<table>/:id).
     * Requirements: Must chain .eq('id', 'value') before calling.
     */
    async delete(): Promise<QueryResponse<null>> {
        if (!this.matchId) return { data: null, error: '.eq("id", value) is required for delete()' }
        try {
            const res = await fetch(`${this.url}/${this.matchId}`, {
                method: 'DELETE',
                headers: this.headers,
            })
            if (!res.ok) return { data: null, error: await res.text() }
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err.message : 'Network error' }
        }
    }
}

/**
 * Database module — the factory that produces QueryBuilders.
 * Bound to the GeniusBaseClient and called via `gb.from('tableName')`.
 */
export class DatabaseClient {
    private readonly baseUrl: string
    private readonly headers: Record<string, string>

    setToken(token: string) {
        this.headers["Authorization"] = `Bearer ${token}`
    }

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    from<T = Record<string, unknown>>(tableName: string): QueryBuilder<T> {
        return new QueryBuilder<T>(
            `${this.baseUrl}/api/v1/${tableName}`,
            this.headers
        )
    }
}
