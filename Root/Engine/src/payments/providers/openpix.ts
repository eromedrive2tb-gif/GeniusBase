/**
 * Payment Provider: OpenPix / Woovi
 * Root/Engine/src/payments/providers/openpix.ts
 *
 * Implementa a interface PaymentProvider usando a API sandbox da Woovi.
 * Produção: troque OPENPIX_BASE_URL por https://api.woovi.com
 *
 * Referência: https://api.woovi-sandbox.com (OpenAPI 3.0.3)
 * Auth: Authorization: Bearer <APP_ID>
 */

import type {
    PaymentProvider,
    CreateChargeDTO,
    ChargeResponse,
    WebhookEvent,
} from '../types'

// Default = production. Tenant can configure { appId, sandbox: true } for sandbox.
const OPENPIX_PROD_URL = 'https://api.woovi.com'
const OPENPIX_SANDBOX_URL = 'https://api.woovi-sandbox.com'

// ─── OpenPix charge shape (subset we care about) ─────────────

interface OpenPixCharge {
    status: string
    correlationID: string
    brCode?: string
    paymentLinkUrl?: string
    paymentMethods?: {
        pix?: { brCode?: string }
    }
}

interface OpenPixCreateResponse {
    charge?: OpenPixCharge
    brCode?: string
    correlationID?: string
    paymentLinkUrl?: string
    error?: string
}

// ─── OpenPix webhook body ─────────────────────────────────────

interface OpenPixWebhookBody {
    event?: string
    charge?: {
        correlationID?: string
        status?: string
        customer?: {
            name?: string
            taxID?: { taxID?: string }
        }
    }
}

// ─── Provider ─────────────────────────────────────────────────

export class OpenPixProvider implements PaymentProvider {
    /**
     * Creates a Pix charge (cobrança dinâmica) via Woovi.
     * Reads appId + optional sandbox flag from credentials JSON.
     *
     * Maps our agnostic DTO to OpenPix's endpoint:
     *   POST /api/v1/charge?return_existing=true
     *
     * Returns the BR Code (Copia e Cola) for the client to render as QR.
     */
    async createCharge(dto: CreateChargeDTO, appId: string): Promise<ChargeResponse> {
        // appId may be prefixed with 'sandbox|' to indicate sandbox environment
        // Format stored in credentials: { appId, sandbox?: boolean }
        // When passed here, the caller in payments.ts passes a combined string:
        //   sandbox mode  → 'sandbox|<actual_app_id>'
        //   production    → '<actual_app_id>'
        const isSandbox = appId.startsWith('sandbox|')
        const actualId = isSandbox ? appId.slice('sandbox|'.length) : appId
        const baseUrl = isSandbox ? OPENPIX_SANDBOX_URL : OPENPIX_PROD_URL

        const res = await fetch(`${baseUrl}/api/v1/charge?return_existing=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Woovi uses the raw App ID as Authorization value — NO 'Bearer' prefix.
                // Despite examples showing 'Bearer', the actual API rejects it with 401.
                'Authorization': actualId,
            },
            body: JSON.stringify({
                correlationID: dto.correlationID,
                value: dto.amount,       // already in cents
                comment: dto.comment ?? 'Cobrança GeniusBase',
            }),
        })

        const body = await res.json() as OpenPixCreateResponse

        if (!res.ok || body.error) {
            throw new Error(`OpenPix createCharge failed: ${body.error ?? res.status}`)
        }

        // brCode may be top-level or nested inside charge.paymentMethods.pix
        const brCode =
            body.brCode ??
            body.charge?.brCode ??
            body.charge?.paymentMethods?.pix?.brCode ??
            null

        // paymentLinkUrl may be top-level or inside charge
        const paymentLinkUrl = body.paymentLinkUrl ?? body.charge?.paymentLinkUrl ?? undefined

        return {
            providerChargeId: body.charge?.correlationID ?? dto.correlationID,
            brCode,
            paymentLinkUrl,
            status: body.charge?.status ?? 'ACTIVE',
            raw: body,
        }
    }

    /**
     * Parses an incoming Woovi webhook body.
     *
     * Woovi sends: { event: 'OPENPIX:CHARGE_COMPLETED', charge: { correlationID, ... } }
     * We normalise to our internal vocabulary.
     */
    async parseWebhook(body: unknown): Promise<WebhookEvent> {
        const wb = body as OpenPixWebhookBody
        const providerChargeId = wb.charge?.correlationID ?? ''

        const payer_name = wb.charge?.customer?.name
        // OpenPix usually sends taxID nested: customer.taxID.taxID or just customer.taxID (string)
        const rawTaxId = wb.charge?.customer?.taxID
        const payer_document = typeof rawTaxId === 'object' ? rawTaxId?.taxID : rawTaxId

        if (wb.event === 'OPENPIX:CHARGE_COMPLETED') {
            return { type: 'CHARGE_COMPLETED', providerChargeId, payer_name, payer_document, raw: body }
        }

        if (wb.event === 'OPENPIX:CHARGE_EXPIRED' || wb.event === 'OPENPIX:CHARGE_FAILED') {
            return { type: 'CHARGE_FAILED', providerChargeId, raw: body }
        }

        return { type: 'UNKNOWN', providerChargeId, raw: body }
    }
}
