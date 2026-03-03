/**
 * Public BaaS Payments Route — Webhook handler
 * Root/Engine/src/api/v1/payments.ts
 */

import { createAuthRouter } from '../../utils/router'
import { GatewayRegistry } from '../../domain/gateways/GatewayRegistry'
import { PaymentEventHandler } from '../../domain/events/PaymentEventHandler'
import { BadRequestError } from '../../domain/errors'
import { z } from 'zod'

const paymentsRoute = createAuthRouter()
// ── POST /webhooks/:provider ───────────────────────────────────────────

paymentsRoute.post('/webhooks/:provider', async (c) => {
    const providerName = c.req.param('provider')

    let gateway
    try { gateway = GatewayRegistry.get(providerName) } catch {
        return c.json({ ok: true }, 200)
    }

    let body: unknown
    try { body = await c.req.json() } catch {
        throw new BadRequestError('Invalid JSON body')
    }

    const event = await gateway.extractWebhookData(body)

    // Validate the normalized webhook event struct
    const WebhookEventSchema = z.object({
        type: z.enum(['CHARGE_COMPLETED', 'CHARGE_FAILED', 'UNKNOWN']),
        providerChargeId: z.string().min(1)
    }).passthrough()

    WebhookEventSchema.parse(event)

    if (event.type === 'CHARGE_COMPLETED' && event.providerChargeId) {
        // Delegate all logic to Event Handler
        await PaymentEventHandler.processSuccess(c.env, event.providerChargeId, {
            name: event.payer_name,
            document: event.payer_document,
            email: event.payer_email
        }, providerName)
    }

    if (event.type === 'CHARGE_FAILED' && event.providerChargeId) {
        await PaymentEventHandler.processFailure(c.env.DB, event.providerChargeId)
    }

    return c.json({ ok: true }, 200)
})

export { paymentsRoute }
