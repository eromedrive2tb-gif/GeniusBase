export interface Product {
    id: string
    tenant_id: string
    name: string
    price: number
    stock: number
    metadata?: Record<string, any>
    created_at: number
}

export interface Customer {
    id: string
    tenant_id: string
    name: string
    email?: string | null
    document?: string | null
    metadata?: Record<string, any>
    created_at: number
}
