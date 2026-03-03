/**
 * Webhook Dispatcher (EDA Growth Engine)
 * Root/Engine/src/domain/events/WebhookDispatcher.ts
 */

import { D1Database, ExecutionContext } from "@cloudflare/workers-types"

export class WebhookDispatcher {
    /**
     * Sends an event to all configured webhooks for a tenant that are listening to it.
     */
    static async dispatch(env: any, tenantId: string, eventName: string, payload: any, ctx?: ExecutionContext) {
        const db: D1Database = env.DB

        try {
            // Fetch all webhooks for this tenant
            const { results } = await db.prepare(
                `SELECT id, url, events FROM tenant_webhooks WHERE tenant_id = ?`
            ).bind(tenantId).all<{ id: string, url: string, events: string }>()

            if (!results || results.length === 0) return

            const dispatchPromises = results.map(async (webhook) => {
                try {
                    const subscribedEvents: string[] = JSON.parse(webhook.events || '[]')

                    // Check if webhook is listening to this specific event or all events ('*')
                    if (!subscribedEvents.includes('*') && !subscribedEvents.includes(eventName)) {
                        return // Skip
                    }

                    const reqPromise = fetch(webhook.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'GeniusBase-Webhook/1.0',
                            'X-GeniusBase-Event': eventName,
                        },
                        body: JSON.stringify({
                            event: eventName,
                            tenant_id: tenantId,
                            timestamp: new Date().toISOString(),
                            payload
                        })
                    }).catch(err => console.error(`Webhook ${webhook.id} error:`, err))

                    if (ctx) {
                        ctx.waitUntil(reqPromise)
                    } else {
                        await reqPromise
                    }
                } catch (err) {
                    console.error(`Error matching webhook ${webhook.id}:`, err)
                }
            })

            // If context is available, we don't need to await the Promise.all here
            // because waitUntil is used per-request. But we await the map mapping.
            await Promise.all(dispatchPromises)

        } catch (err) {
            console.error('WebhookDispatcher generic error:', err)
        }
    }
}
