/**
 * Registry: GatewayRegistry
 * Root/Engine/src/domain/gateways/GatewayRegistry.ts
 */

import { IPaymentGateway } from './IPaymentGateway'
import { OpenPixGateway } from './providers/OpenPixGateway'

export class GatewayRegistry {
    private static instances: Record<string, IPaymentGateway> = {
        openpix: new OpenPixGateway(),
    }

    static get(provider: string): IPaymentGateway {
        const instance = this.instances[provider.toLowerCase()]
        if (!instance) {
            throw new Error(`Payment provider "${provider}" is not supported or registered.`)
        }
        return instance
    }
}
