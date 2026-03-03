# 🗺️ MAPEAMENTO TÉCNICO: GeniusBase v1 APIs

Este documento contém o escaneamento exato das rotas públicas localizadas em `Root/Engine/src/api/v1/`.

## 1. Auth (`api/v1/auth/`)

### `POST /api/v1/auth/register`
* **Autenticação:** apiKeyAuth (Exigida role: `service`)
* **Intenção:** Criar um End-User na base do Tenant (Signup anonimo/frontend intermediado pelo backend do tenant).
* **Payload Esperado (Body):** `{ "email": "user@example.com", "password": "securepassword123" }`
* **Equivalente no SDK:** `gb.auth.register(...)` (via AuthClient estendido)

### `POST /api/v1/auth/login`
* **Autenticação:** apiKeyAuth (Service API Key do Lojista/Tenant)
* **Intenção:** Autenticar um End-User a partir das credenciais, gerando um `End-User JWT` seguro para ele.
* **Payload Esperado (Body):** `{ "email": "user@example.com", "password": "securepassword123" }`
* **Equivalente no SDK:** `gb.auth.login(email, password)`


## 2. Tabelas Dinâmicas (Database Básico)

### `GET /api/v1/products`
* **Autenticação:** apiKeyAuth (Service API Key ou End-User JWT)
* **Intenção:** Listar os últimos 50 produtos cadastrados no catálogo do Tenant.
* **Payload Esperado (Body):** N/A
* **Equivalente no SDK:** `gb.from('products').select()`

### `POST /api/v1/products`
* **Autenticação:** apiKeyAuth (Service API Key ou End-User JWT)
* **Intenção:** Inserir um novo produto no catálogo do Tenant.
* **Payload Esperado (Body):** `{ "name": "Camiseta", "price": 9900, "stock": 10 }`
* **Equivalente no SDK:** `gb.from('products').insert({ name, price, stock })`

### `GET /api/v1/customers`
* **Autenticação:** apiKeyAuth (Service API Key ou End-User JWT)
* **Intenção:** Listar clientes gravados no CRM/Base do Tenant.
* **Payload Esperado (Body):** N/A
* **Equivalente no SDK:** `gb.from('customers').select()`

### `POST /api/v1/customers`
* **Autenticação:** apiKeyAuth (Service API Key ou End-User JWT)
* **Intenção:** Cadastrar um novo cliente no CRM do Tenant para vinculação futura com compras.
* **Payload Esperado (Body):** `{ "name": "João da Silva", "email": "joao@example.com" }`
* **Equivalente no SDK:** `gb.from('customers').insert({ name, email })`


## 3. Telemetria e Eventos (`api/v1/events.ts`)

### `POST /api/v1/events`
* **Autenticação:** apiKeyAuth (Role: `service` ou `end_user`)
* **Intenção:** Disparar de forma livre eventos analíticos (telemetria) do frontend para notificar a Dashboard em tempo real.
* **Payload Esperado (Body):** `{ "name": "NomeDoEvento", "payload": { "qualquer": "dado" } }`
* **Equivalente no SDK:** `gb.events.track('NomeDoEvento', { ... })`


## 4. Ecossistema Financeiro: Pedidos e E-Commerce (`api/v1/orders.ts`)

### `POST /api/v1/orders`
* **Autenticação:** apiKeyAuth (Role exigida: Service)
* **Intenção:** Criar um Checkout transacional (Pedido) convertendo uma lista de items num PIX consolidado buscando preços reais no banco.
* **Payload Esperado (Body):** `{ "provider": "openpix", "items": [{ "product_id": "prod_123", "quantity": 1 }], "customer_id": "cus_456" }` *(O customer_id é opcional)*
* **Equivalente no SDK:** `gb.orders.checkout({ items, provider, customer_id })`

### `GET /api/v1/orders/:id`
* **Autenticação:** apiKeyAuth (Role exigida: Service)
* **Intenção:** Consultar o status e detalhes cruciais de um pedido (Polling fallback).
* **Payload Esperado (Body):** N/A (Path Parameter: `:id`)
* **Equivalente no SDK:** Manual REST fetch ou SDK Helpers a serem exportados no OrdersClient.


## 5. Ecossistema Financeiro: Transações Avulsas (`api/v1/transactions.ts`)

### `POST /api/v1/transactions`
* **Autenticação:** apiKeyAuth (Role exigida: `service`)
* **Intenção:** Criar uma cobrança financeira desconectada de produtos (Gorjetas, Doações, Pagamentos dinâmicos avulsos).
* **Payload Esperado (Body):** `{ "amount": 5000, "provider": "openpix", "customer_id": "cus_123", "metadata": {} }` *(Amount em centavos)*
* **Equivalente no SDK:** `gb.transactions.create({ amount, provider, customer_id, metadata })`


## 6. Webhooks de Integradores Externos (`api/v1/payments.ts`)

### `POST /api/v1/payments/webhooks/:provider`
* **Autenticação:** Pública (Webhook Callback Endpoint)
* **Intenção:** Receber os avisos de `CHARGE_COMPLETED` enviados pelas plataformas de pagamento (Woovi, Stripe) e atualizar o Banco e WebSockets.
* **Payload Esperado (Body):** *[Payload dinâmico da Gateway que contém ID do Charge e infos do Cliente]*
* **Equivalente no SDK:** N/A (Backend → Backend Exclusivo)

### `POST /api/v1/payments/charges`
* **Autenticação:** apiKeyAuth
* **Intenção:** (Legacy Phase 12 Compatible) Cria charge único sem o isolamento de Transaction/Order.
* **Payload Esperado (Body):** `{ "provider": "openpix", "amount": 1000, "metadata": {} }`
* **Equivalente no SDK:** N/A (Legado/Depreciado a favor de `transactions` e `orders`).


## 7. Realtime e EDA (`api/v1/realtime/index.ts`)

### `GET /api/v1/realtime`
* **Autenticação:** Query String `?token=<JWT>` (Roles: `end_user` ou `service`)
* **Intenção:** Iniciar o protocolo Upgrade WebSocket conectado ao Durable Object que gerencia os eventos daquele Tenant.
* **Payload Esperado (Body):** N/A
* **Equivalente no SDK:** `gb.channel('nome-do-canal')` *(Inicializado magicamente no construtor do cliente)*
