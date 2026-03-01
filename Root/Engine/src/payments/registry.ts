/**
 * Payment Provider Registry
 * Root/Engine/src/payments/registry.ts
 *
 * Maps provider name strings to their implementations.
 * To add Stripe: import StripeProvider, add to registry below.
 * Zero changes required in routes or core.
 *
 * Open/Closed Principle: open for extension (new providers),
 * closed for modification (existing routes never change).
 */

import { OpenPixProvider } from './providers/openpix'
import type { PaymentProvider } from './types'

// ─── Registry ────────────────────────────────────────────────

const providerRegistry: Record<string, PaymentProvider> = {
    openpix: new OpenPixProvider(),
    // stripe: new StripeProvider(),  ← future providers registered here
}

// ─── Accessor ────────────────────────────────────────────────

export type SupportedProvider = keyof typeof providerRegistry

/**
 * Retrieves a payment provider instance by name.
 * Throws a typed error if the provider is not registered.
 *
 * @example
 * const provider = getProvider('openpix')             // ✅
 * const provider = getProvider('unknown')             // ❌ throws
 */
export function getProvider(name: string): PaymentProvider {
    const provider = providerRegistry[name]
    if (!provider) {
        throw new Error(
            `Payment provider "${name}" is not registered. ` +
            `Supported providers: ${Object.keys(providerRegistry).join(', ')}`
        )
    }
    return provider
}
