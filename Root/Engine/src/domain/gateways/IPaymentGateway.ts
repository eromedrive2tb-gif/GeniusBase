/**
 * Domain Interface: IPaymentGateway
 * Root/Engine/src/domain/gateways/IPaymentGateway.ts
 */

export interface CreateChargeDTO {
    correlationID: string
    amount: number
    comment?: string
    metadata?: any
}

export interface ChargeResponse {
    providerChargeId: string
    brCode: string | null
    paymentLinkUrl?: string
    status: string
    raw: unknown
}

export interface WebhookEvent {
    type: 'CHARGE_COMPLETED' | 'CHARGE_FAILED' | 'UNKNOWN'
    providerChargeId: string
    payer_name?: string
    payer_document?: string
    payer_email?: string
    raw: unknown
}

export interface IPaymentGateway {
    createCharge(dto: CreateChargeDTO, credentials: string): Promise<ChargeResponse>
    extractWebhookData(payload: unknown): Promise<WebhookEvent>
}
