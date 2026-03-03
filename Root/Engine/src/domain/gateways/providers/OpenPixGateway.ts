/**
 * Provider: OpenPixGateway
 * Root/Engine/src/domain/gateways/providers/OpenPixGateway.ts
 */

import { IPaymentGateway, CreateChargeDTO, ChargeResponse, WebhookEvent } from '../IPaymentGateway'

const OPENPIX_PROD_URL = 'https://api.woovi.com'
const OPENPIX_SANDBOX_URL = 'https://api.woovi-sandbox.com'

export class OpenPixGateway implements IPaymentGateway {
    async createCharge(dto: CreateChargeDTO, credentialsRaw: string): Promise<ChargeResponse> {
        let creds: any
        try {
            creds = JSON.parse(credentialsRaw)
        } catch {
            throw new Error(`Invalid credentials format for OpenPix: must be valid JSON`)
        }

        const rawAppId = typeof creds.appId === 'string' ? creds.appId.trim() : ''
        if (!rawAppId) {
            throw new Error('Gateway credential "appId" is missing for OpenPix')
        }

        const isSandbox = creds.sandbox === true
        const appId = rawAppId // OpenPix uses appId directly in Authorization header
        const baseUrl = isSandbox ? OPENPIX_SANDBOX_URL : OPENPIX_PROD_URL

        const res = await fetch(`${baseUrl}/api/v1/charge?return_existing=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': appId,
            },
            body: JSON.stringify({
                correlationID: dto.correlationID,
                value: dto.amount,
                comment: dto.comment ?? 'Cobrança GeniusBase',
            }),
        })

        const body: any = await res.json()

        if (!res.ok || body.error) {
            throw new Error(`OpenPix createCharge failed: ${body.error ?? res.status}`)
        }

        const brCode = body.brCode ?? body.charge?.brCode ?? body.charge?.paymentMethods?.pix?.brCode ?? null
        const paymentLinkUrl = body.paymentLinkUrl ?? body.charge?.paymentLinkUrl ?? undefined

        return {
            providerChargeId: body.charge?.correlationID ?? dto.correlationID,
            brCode,
            paymentLinkUrl,
            status: body.charge?.status ?? 'ACTIVE',
            raw: body,
        }
    }

    async extractWebhookData(payload: unknown): Promise<WebhookEvent> {
        const wb = payload as any
        const providerChargeId = wb.charge?.correlationID ?? ''
        const payer_name = wb.charge?.customer?.name
        const payer_email = wb.charge?.customer?.email
        const rawTaxId = wb.charge?.customer?.taxID
        const payer_document = typeof rawTaxId === 'object' ? rawTaxId?.taxID : rawTaxId

        if (wb.event === 'OPENPIX:CHARGE_COMPLETED') {
            return { type: 'CHARGE_COMPLETED', providerChargeId, payer_name, payer_document, payer_email, raw: payload }
        }

        if (wb.event === 'OPENPIX:CHARGE_EXPIRED' || wb.event === 'OPENPIX:CHARGE_FAILED') {
            return { type: 'CHARGE_FAILED', providerChargeId, raw: payload }
        }

        return { type: 'UNKNOWN', providerChargeId, raw: payload }
    }
}
