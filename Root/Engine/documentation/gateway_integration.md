# Guia do Desenvolvedor: Integração Modular de Gateways de Pagamento (Extensões Padrão S.O.L.I.D. & EDA)

A arquitetura financeira do GeniusBase foi desenhada para ser "burra", extensível e isolada (S.O.L.I.D.). O motor central de E-commerce e Transações **não sabe e não deve saber** quais gateways (Stripe, Mercado Pago, Pagar.me, OpenPix, etc.) existem no ecossistema.

Este guia documenta o padrão exato para plugar qualquer novo provedor de pagamento em nossa Event-Driven Architecture (EDA) sem alterar o código vital do BaaS.

---

## 🏗️ 1. O Contrato Sagrado: `IPaymentGateway`

Todo provedor de pagamento é um **Plugin**. Ele deve assinar isoladamente o contrato definido na interface base encontrada em `src/domain/gateways/GatewayRegistry.ts`.

Nesta arquitetura The "Core" is Closed for modification, but Open for Extension.

### Contrato Exigido:
```typescript
interface IPaymentGateway {
    /**
     * @param payload { correlationID, amount, comment }
     * @param credentialsJson String JSON pura com os segredos recuperados do D1.
     */
    createCharge(payload: ChargePayload, credentialsJson: string): Promise<ChargeResponse>
    
    /**
     * @param payload Request Body bruto recebido no webhook (req.json())
     * @param credentialsJson (Opcional) Usar caso o extrator precise validar assinaturas (Webhook Secrets)
     */
    extractWebhookData(payload: any, credentialsJson?: string): Promise<WebhookData>
}
```

---

## 🛡️ 2. Como criar sua Classe (Exemplo: Mercado Pago)

Crie um arquivo novo dentro da pasta de provedores: `src/domain/gateways/providers/MercadoPagoGateway.ts`.

### Regras do Provedor:
1. **Nunca injete o Banco de Dados (D1) aqui dentro.** O gateway é burro. Ele apenas faz requisições HTTP (fetch) com base no que recebeu.
2. **Faça o parsing de `credentialsJson` internamente.** O banco armazena um JSON genérico flexível por Inquilino (Tenant). É papel do Gateway saber quais chaves ele deve extrair (`accessToken`, `publicKey`, etc).
3. **Mapeamento de Retornos.** Converta os retornos pesados do gateway externo para nossa resposta enxuta universal `ChargeResponse` contendo obrigatoriamente `providerChargeId`.

### Exemplo Base:
```typescript
import { IPaymentGateway, ChargePayload, ChargeResponse, WebhookData } from '../GatewayRegistry'

export class MercadoPagoGateway implements IPaymentGateway {
    async createCharge(payload: ChargePayload, credentialsJson: string): Promise<ChargeResponse> {
        // 1. Parsing isolado de credenciais
        const { accessToken } = JSON.parse(credentialsJson)

        // 2. Fetch HTTP burro e direto
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${accessToken}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transaction_amount: payload.amount / 100, // MP usa decimais, nossa engine usa centavos
                description: payload.comment,
                external_reference: payload.correlationID, // Amarração vitrine/banco
                payment_method_id: "pix"
            })
        })

        const data = await response.json()

        if (!response.ok) throw new Error(\`MP Error: \${data.message}\`)

        // 3. Normalização Universal
        return {
            providerChargeId: data.id.toString(),
            brCode: data.point_of_interaction?.transaction_data?.qr_code,
            paymentLinkUrl: data.point_of_interaction?.transaction_data?.ticket_url
        }
    }

    async extractWebhookData(payload: any): Promise<WebhookData> {
        // O Mercado Pago manda o ID no event.data.id
        const action = payload.action
        const mpId = payload.data?.id?.toString()

        if (!mpId) throw new Error("ID não encontrado no webhook.")

        // Mapeda para nosso sistema EDA (Event-Driven)
        let eventType: WebhookData['eventType'] = 'UNKNOWN'
        if (action === 'payment.created') eventType = 'CHARGE_CREATED'
        if (action === 'payment.updated' && payload.status === 'approved') eventType = 'CHARGE_COMPLETED'

        return {
            providerChargeId: mpId,
            eventType,
            payer: {
                 // Pode requerer um fetch adicional se o payload do webhook for raso
                 // nome: ...
                 // documento: ...
            }
        }
    }
}
```

---

## 🖲️ 3. O Registro (Registry Pattern)

Para que a Engine e a API de rotas saibam da existência do seu novo Plugin, basta importá-lo e instanciá-lo na Tabela de Registro Estática no mesmo arquivo `GatewayRegistry.ts`.

```typescript
import { OpenPixGateway } from './providers/OpenPixGateway'
import { StripeGateway } from './providers/StripeGateway'
import { MercadoPagoGateway } from './providers/MercadoPagoGateway' // <-- Seu Import

export class GatewayRegistry {
    private static gateways: Record<string, IPaymentGateway> = {
        openpix: new OpenPixGateway(),
        stripe: new StripeGateway(),
        mercadopago: new MercadoPagoGateway(), // <-- Registro OCP
    }

    static get(providerName: string): IPaymentGateway { ... }
}
```

> **Atenção:** Daqui em diante a mágica acontece sozinha. A API de checkout (`/api/v1/orders`) e transações avulsas (`/api/v1/transactions`) buscarão instâncias neste Registry usando o nome fornecido no JSON do cliente (`"provider": "mercadopago"`). Nenhum "If/Else" precisa ser escrito nas pipelines HTTP.

---

## 🎣 4. Webhooks via EDA (Event-Driven)

Nosso sistema de BaaS usa uma arquitetura assíncrona orientada a eventos.
Uma rota **Única, Burra e Global** absorve toda a internet.

### Endpoint Universal Automático
Quando você registra o gateway, ele automaticamente ganha essa rota de webhooks segura:
`POST /api/v1/payments/webhooks/:provider`
*(Exemplo: `/api/v1/payments/webhooks/mercadopago`)*

O fluxo que ocorrerá sem que você codifique nada será:
1. Rota recebe o POST do Gateway Externo.
2. Identifica o parâmetro `:provider` e chama `GatewayRegistry.get("mercadopago")`.
3. Pede para sua classe mastigar os dados: `mp.extractWebhookData(payload)`.
4. Determina qual o providerChargeId atrelado.
5. Usa `PaymentEventHandler` para despachar transações atômicas de UPDATE no D1 Database de forma agnóstica (`status = COMPLETED` ou `status = FAILED`).
6. Envia propagação WebSocket (RPC) via Filas (Durable Objects) para todas as abas admin do respectivo locatário (Tenant) com o evento genérico unificado `ORDER_PAID` ou `TRANSACTION_COMPLETED`.

Nenhum hardcode, acoplamento de banco ou processamento impeditivo acontece na camada de Rotas. Trabalhamos exclusivamente injetando instâncias puras de TS.
