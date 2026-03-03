export interface Product<Meta = Record<string, any>> {
    id: string
    tenant_id: string
    name: string
    price: number
    stock: number
    metadata?: Meta
    created_at: number
}

export interface Customer<Meta = Record<string, any>> {
    id: string
    tenant_id: string
    name: string
    email?: string | null
    document?: string | null
    metadata?: Meta
    created_at: number
}
