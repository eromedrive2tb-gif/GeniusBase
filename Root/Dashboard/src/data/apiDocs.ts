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
        path: '/api/v1/orders',
        description: 'Cria um Pedido completo com itens do carrênho e gera automaticamente uma cobrança PIX. Os preços são sempre validados no servidor (nunca confie em preços vindos do frontend). Quando o pagamento for confirmado, o evento ORDER_PAID será emitido via WebSocket.',
        request: `{\n  "provider": "openpix",\n  "items": [\n    { "product_id": "prod_abc", "quantity": 2 }\n  ]\n}\n\n// Escute o resultado via SDK:\ngb.channel(\'loja\')\n  .on(\'ORDER_PAID\', (pedido) => {\n    console.log(\'Pedido pago!\', pedido)\n    // pedido.order_id, pedido.total_amount, pedido.items...\n  })\n  .subscribe()`,
        responses: [
            { status: 201, label: 'Pedido criado. Retorna order_id, transaction_id, brCode (QR Pix) e itens com preços congelados.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: items inválidos ou provider ausente.', color: 'var(--gb-amber)' },
            { status: 401, label: 'Unauthorized: token ausente, expirado ou sem role "service".', color: 'var(--gb-red)' },
            { status: 422, label: 'Unprocessable: produto não encontrado ou gateway não configurada.', color: 'var(--gb-amber)' },
            { status: 502, label: 'Bad Gateway: a gateway de pagamento retornou erro.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/payments/webhooks/:provider',
        description: 'Endpoint público chamado pela Gateway (ex: Woovi/OpenPix) após confirmar um pagamento. Configure este URL no painel da sua gateway. O GeniusBase processa o evento, atualiza o pedido no banco e emite ORDER_PAID via WebSocket para o app cliente e para a Dashboard.',
        request: `// ⚠️ Configure na Woovi/OpenPix como URL de Webhook:\nhttps://SEU_WORKER.workers.dev/api/v1/payments/webhooks/openpix\n\n// O payload enviado pela Woovi (automático):\n{\n  "event": "OPENPIX:CHARGE_COMPLETED",\n  "charge": {\n    "correlationID": "ord_abc123",\n    "status": "COMPLETED"\n  }\n}`,
        responses: [
            { status: 200, label: 'OK: evento processado. Pedido atualizado para PAID. ORDER_PAID broadcast enviado.', color: 'var(--gb-green)' }
        ]
    }
]

// ── Webhook Guide (destaque visual separado na UI) ──────────────────
export interface WebhookStep {
    icon: string
    title: string
    description: string
    code?: string
}

export const webhookGuide: WebhookStep[] = [
    {
        icon: '1️⃣',
        title: 'Configure o URL de Webhook na Woovi/OpenPix',
        description: 'No painel da Woovi vá em API/Plugins → Webhooks e cole a URL abaixo. NÃO aponte para o seu frontend — ele é Serverless e não deve processar webhooks diretamente.',
        code: 'https://SEU_WORKER.workers.dev/api/v1/payments/webhooks/openpix',
    },
    {
        icon: '2️⃣',
        title: 'O GeniusBase recebe e processa o evento',
        description: 'Quando a Woovi confirmar o pagamento, o GeniusBase atualiza automaticamente o Pedido (status → PAID) e a Transação no banco de dados, sem nenhuma ação manual sua.',
    },
    {
        icon: '3️⃣',
        title: 'Escute ORDER_PAID no seu frontend via SDK',
        description: 'No seu app (React, Vue, Svelte, JS puro), use o SDK para escutar o evento em tempo real. O GeniusBase entrega o evento via WebSocket assim que o banco é atualizado.',
        code: `gb.channel('loja')\n  .on('ORDER_PAID', (pedido) => {\n    mostrarTelaDeConfirmacao(pedido)\n    liberarAcessoAoConteudo(pedido.order_id)\n  })\n  .subscribe()`,
    },
]
