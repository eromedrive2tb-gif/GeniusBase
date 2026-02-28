import type { HttpMethod } from '../components/atoms/Badge'
import type { Child } from 'hono/jsx'

export interface ApiDocResponse {
    status: number
    label: string
    color: 'var(--gb-green)' | 'var(--gb-red)' | 'var(--gb-amber)'
}

export interface ApiDocEntry {
    method: HttpMethod
    path: string
    description: string
    request?: string
    responseCode?: string
    responses: ApiDocResponse[]
}

export const baasApiDocs: ApiDocEntry[] = [
    {
        method: 'POST',
        path: '/api/v1/auth/register',
        description: 'Registra um novo End-User (usuário final) no seu aplicativo, atrelado ao seu Tenant.',
        request: `{\n  "email": "user@app.com",\n  "password": "securepassword"\n}`,
        responses: [
            { status: 201, label: 'Criado: retorna os dados iniciais do usuário.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request (senha muito curta ou falta email).', color: 'var(--gb-amber)' },
            { status: 409, label: 'Conflict (e-mail já está em uso neste app).', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Autentica um End-User existente na sua aplicação e retorna um Token JWT de End-User.',
        request: `{\n  "email": "user@app.com",\n  "password": "securepassword"\n}`,
        responses: [
            { status: 200, label: 'OK: (Retorna o Token JWT daquele End-User).', color: 'var(--gb-green)' },
            { status: 401, label: 'Unauthorized: Credenciais incorretas.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'GET',
        path: '/api/v1/customers',
        description: 'Lista todos os clientes registrados no seu CRM/Tenant ordenados de forma decrescente.',
        responseCode: `{\n  "data": [\n    { "id": "cus_1234", "name": "John Doe", "email": "john@doe.com" }\n  ]\n}`,
        responses: []
    },
    {
        method: 'POST',
        path: '/api/v1/customers',
        description: 'Cria um novo cliente no CRM do seu Tenant.',
        request: `{\n  "name": "Jane Smith",\n  "email": "jane@smith.com"\n}`,
        responses: []
    },
    {
        method: 'GET',
        path: '/api/v1/products',
        description: 'Lista todos os produtos ativos do Catálogo do seu Tenant.',
        responseCode: `{\n  "data": [\n    { "id": "prod_1234", "name": "Plano Premium", "price": 9900 }\n  ]\n}`,
        responses: []
    },
    {
        method: 'POST',
        path: '/api/v1/products',
        description: 'Cria um novo produto no seu Catálogo.',
        request: `{\n  "name": "Mesa Digitalizadora",\n  "price": 45000,\n  "stock": 10\n}`,
        responses: []
    }
]
