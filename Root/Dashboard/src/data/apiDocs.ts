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
        description: 'Cria um End-User (usuário final) na base do seu Tenant (Signup anônimo/frontend intermediado pelo backend da loja/app).',
        request: `// Equivalente SDK:\ngb.auth.register('user@app.com', 'securepassword')\n\n// HTTP Nativo:\n{\n  "email": "user@app.com",\n  "password": "securepassword"\n}`,
        responses: [
            { status: 201, label: 'Criado: retorna os dados iniciais do usuário.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request (senha muito curta ou falta email).', color: 'var(--gb-amber)' },
            { status: 409, label: 'Conflict (e-mail já está em uso neste app).', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Autentica um End-User a partir das credenciais, gerando um End-User JWT seguro para ele utilizar nas chamadas do frontend.',
        request: `// Equivalente SDK:\nconst jwt = await gb.auth.login('user@app.com', 'securepass')\n\n// HTTP Nativo:\n{\n  "email": "user@app.com",\n  "password": "securepassword"\n}`,
        responses: [
            { status: 200, label: 'OK: (Retorna o Token JWT daquele End-User).', color: 'var(--gb-green)' },
            { status: 401, label: 'Unauthorized: Credenciais incorretas.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'GET',
        path: '/api/v1/customers',
        description: 'Lista os clientes registrados no seu CRM/Tenant.',
        request: `// Equivalente SDK:\nawait gb.from('customers').select()`,
        responses: []
    },
    {
        method: 'POST',
        path: '/api/v1/customers',
        description: 'Cadastra um novo cliente no CRM do Tenant para vinculação futura com compras.',
        request: `// Equivalente SDK:\nawait gb.from('customers').insert({ name: "Jane Smith", email: "jane@smith.com" })\n\n// HTTP Nativo:\n{\n  "name": "Jane Smith",\n  "email": "jane@smith.com"\n}`,
        responses: []
    },
    {
        method: 'GET',
        path: '/api/v1/products',
        description: 'Lista todos os produtos ativos do Catálogo do seu Tenant.',
        request: `// Equivalente SDK:\nawait gb.from('products').select()`,
        responses: []
    },
    {
        method: 'POST',
        path: '/api/v1/products',
        description: 'Insere um novo produto no catálogo do Tenant.',
        request: `// Equivalente SDK:\nawait gb.from('products').insert({ name: "Produto Teste", price: 45000, stock: 10 })\n\n// HTTP Nativo:\n{\n  "name": "Mesa Digitalizadora",\n  "price": 45000,\n  "stock": 10\n}`,
        responses: []
    },
    {
        method: 'GET',
        path: '/api/v1/realtime',
        description: 'Abre um túnel WebSocket público. Conecte-se passando a Service API Key (ou End-User JWT) como query param `?token=`. O servidor enviará broadcasts de eventos (ex: PRODUCT_CREATED) para todos os clientes conectados deste Tenant.',
        request: `// Equivalente SDK (O SDK cria o túnel automaticamente assim que invocado):\ngb.channel('meu-canal')\n  .on('PRODUCT_CREATED', (payload) => console.log(payload))\n  .subscribe()\n\n// WebSocket nativo\nconst ws = new WebSocket(\n  'wss://seu-worker.workers.dev/api/v1/realtime?token=<SEU_TOKEN>'\n)\nws.onmessage = (e) => {\n  const { type, event, payload } = JSON.parse(e.data)\n  if (type === 'PUSH') console.log(event, payload)\n}`,
        responses: [
            { status: 101, label: 'Switching Protocols: conexão WebSocket estabelecida.', color: 'var(--gb-green)' },
            { status: 401, label: 'Unauthorized: token ausente ou inválido.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/events',
        description: 'Dispara de forma livre eventos analíticos (telemetria) do frontend para notificar a Dashboard em tempo real. O GeniusBase persiste no D1 e notifica via WebSocket.',
        request: `// Equivalente SDK:\nawait gb.events.track('Compra PIX', { valor: 150.00, metodo: 'pix' })\n\n// HTTP Nativo:\n{\n  "name": "Compra PIX",\n  "payload": {\n    "valor": 150.00,\n    "metodo": "pix",\n    "pedido_id": "ORD-789"\n  }\n}`,
        responses: [
            { status: 201, label: 'Criado: evento persistido e broadcast enviado ao Dashboard.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: campo "name" ausente ou body inválido.', color: 'var(--gb-amber)' },
            { status: 401, label: 'Unauthorized: token ausente ou expirado.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/orders',
        description: 'Cria um Checkout transacional (Pedido) convertendo itens num PIX consolidado buscando preços reais no banco de dados. Quando o pagamento for confirmado, emitirá ORDER_PAID.',
        request: `// Equivalente SDK:\nconst pedido = await gb.orders.checkout({\n  provider: 'openpix',\n  items: [{ product_id: 'prod_abc', quantity: 2 }]\n})\n\n// Escute o resultado via SDK:\ngb.channel(\'loja\')\n  .on(\'ORDER_PAID\', (pedido) => console.log(\'Pedido pago!\', pedido))\n  .subscribe()`,
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
        path: '/api/v1/transactions',
        description: 'Cria uma cobrança financeira desconectada de produtos (Gorjetas, Doações, Pagamentos dinâmicos avulsos). Quando a confirmação chegar, emitirá TRANSACTION_COMPLETED com os dados do pagador.',
        request: `// Equivalente SDK (Amount em centavos):\nconst txn = await gb.transactions.create({\n  amount: 5000,\n  provider: 'openpix'\n})\n\n// Escute o resultado via SDK:\ngb.channel(\'loja\')\n  .on(\'TRANSACTION_COMPLETED\', (txn) => console.log('Doação recebida!', txn))\n  .subscribe()`,
        responses: [
            { status: 201, label: 'Transação criada. Retorna transaction_id, provider_transaction_id e brCode (QR Pix).', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: valor menor ou igual a 0 ou provider ausente.', color: 'var(--gb-amber)' },
            { status: 401, label: 'Unauthorized: token ausente, expirado ou sem role "service".', color: 'var(--gb-red)' },
            { status: 502, label: 'Bad Gateway: a gateway de pagamento retornou erro.', color: 'var(--gb-red)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/storage/upload',
        description: 'Faz o upload de um arquivo isolado no bucket Cloudflare R2 do seu Tenant. O payload deve ser `multipart/form-data`. A resposta conterá a `public_url` que deve ser salva no seu banco de dados (ex: como image_url de um produto).',
        request: `// Equivalente SDK Oficial:\nconst arquivo = document.getElementById('meu-input').files[0]\nconst arquivoDoStorage = await gb.storage.upload(arquivo)\nconsole.log(arquivoDoStorage.public_url)\n\n// Equivalente HTTP Fetch Nativo:\nconst formData = new FormData()\nformData.append('file', arquivo)\nfetch('/api/v1/storage/upload', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer <SUA_SERVICE_KEY_OU_JWT>' },\n  body: formData\n})`,
        responses: [
            { status: 201, label: 'Upload concluído: retorna a URL pública (public_url) e metadados.', color: 'var(--gb-green)' },
            { status: 400, label: 'Bad Request: arquivo ausente ou muito grande.', color: 'var(--gb-amber)' }
        ]
    },
    {
        method: 'GET',
        path: '/api/v1/storage/public/:id',
        description: 'Endpoint público (CDN) que resolve o proxy e devolve a mídia física armazenada no R2 através da Cloudflare Edge Network. Esta URL é gerada e devolvida automaticamente (`public_url`) pelo endpoint de Upload.',
        responses: [
            { status: 200, label: 'OK: retorna os bytes binários da mídia ou cache hit (304).', color: 'var(--gb-green)' },
            { status: 404, label: 'Not Found: mídia inexistente.', color: 'var(--gb-amber)' }
        ]
    },
    {
        method: 'POST',
        path: '/api/v1/payments/webhooks/:provider',
        description: 'Endpoint público chamado pela Gateway após confirmar um pagamento. O GeniusBase processa o evento e atualiza a transação para COMPLETED (salvando nome e doc do pagador). Se for um pedido de loja, emite ORDER_PAID. De qualquer forma, sempre emite TRANSACTION_COMPLETED via WebSocket. Tudo automático.',
        request: `// ⚠️ Configure na Woovi/OpenPix como URL de Webhook:\nhttps://SEU_WORKER.workers.dev/api/v1/payments/webhooks/openpix\n\n// O payload enviado pela Woovi (automático):\n{\n  "event": "OPENPIX:CHARGE_COMPLETED",\n  "charge": {\n    "correlationID": "ord_abc123",\n    "status": "COMPLETED"\n  }\n}`,
        responses: [
            { status: 200, label: 'OK: evento processado. Pedido/Transação atualizado para PAID.', color: 'var(--gb-green)' }
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
        title: 'Escute os Eventos no seu frontend via SDK',
        description: 'No seu app, use o SDK para escutar os eventos em tempo real. O GeniusBase entrega o evento via WebSocket assim que o banco é atualizado.',
        code: `gb.channel('loja')\n  .on('ORDER_PAID', (pedido) => {\n    // Para checkout e-commerce (carrinho)\n    liberarAcessoAoConteudo(pedido.order_id)\n  })\n  .on('TRANSACTION_COMPLETED', (txn) => {\n    // Para PIX avulsos, doações...\n    agradecerPagador(txn.payer_name)\n  })\n  .subscribe()`,
    },
]
