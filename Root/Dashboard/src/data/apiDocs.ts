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
    },
    {
        method: 'GET',
        path: '/api/v1/realtime',
        description: 'Abre um túnel WebSocket público. Conecte-se passando a Service API Key como query param `?token=`. O servidor enviará broadcasts de eventos (ex: PRODUCT_CREATED) para todos os clientes conectados deste Tenant.',
        request: `// SDK GeniusBase (recomendado)\ngb.channel('meu-canal')\n  .on('PRODUCT_CREATED', (payload) => console.log(payload))\n  .subscribe()\n\n// WebSocket nativo\nconst ws = new WebSocket(\n  'wss://seu-worker.workers.dev/api/v1/realtime?token=<SUA_SERVICE_KEY>'\n)\nws.onmessage = (e) => {\n  const { type, event, payload } = JSON.parse(e.data)\n  if (type === 'PUSH') console.log(event, payload)\n}`,
        responses: [
            { status: 101, label: 'Switching Protocols: conexão WebSocket estabelecida.', color: 'var(--gb-green)' },
            { status: 401, label: 'Unauthorized: token ausente ou inválido.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/events',
        description: 'Dispara um evento customizado (telemetria) do seu app. O GeniusBase persiste no D1 e notifica o Admin Dashboard em tempo real via WebSocket. Use para rastrear métricas, logs de ações e qualquer evento de negócio.',
        request: `{\n  "name": "Compra PIX",\n  "payload": {\n    "valor": 150.00,\n    "metodo": "pix",\n    "pedido_id": "ORD-789"\n  }\n}`,
        responses: [
            { status: 201, label: 'Criado: evento persistido e broadcast enviado ao Dashboard.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: campo "name" ausente ou body inválido.', color: 'var(--gb-amber)' },
            { status: 401, label: 'Unauthorized: token ausente ou expirado.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/payments/charges',
        description: 'Cria uma cobrança Pix via gateway agnóstica (ex: OpenPix/Woovi). Retorna o `brCode` (Pix Copia e Cola) para o cliente renderizar como QR code. Quando o pagamento é confirmado, o evento `CHARGE_COMPLETED` é disparado via WebSocket para o app cliente e para a Dashboard do admin.',
        request: `{\n  "provider": "openpix",\n  "amount": 10000,\n  "metadata": { "pedido_id": "ORD-999" }\n}\n\n// Escute o resultado via SDK:\ngb.channel('checkout')\n  .on('CHARGE_COMPLETED', (charge) => {\n    console.log('Pix recebido!', charge)\n  })\n  .subscribe()`,
        responses: [
            { status: 201, label: 'Cobrança criada. Retorna id, brCode, status e provider_charge_id.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: provider inválido ou amount ausente/zero.', color: 'var(--gb-amber)' },
            { status: 401, label: 'Unauthorized: token ausente, expirado ou sem role "service".', color: 'var(--gb-red)' },
            { status: 502, label: 'Bad Gateway: a gateway de pagamento retornou erro.', color: 'var(--gb-red)' }
        ]
    }
]
