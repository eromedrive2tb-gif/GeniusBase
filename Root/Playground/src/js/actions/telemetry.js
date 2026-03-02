import { gb } from '../client.js'
import { log } from '../logger.js'

/**
 * Funções de exemplo para eventos customizados (SDK.events)
 */
export async function trackCustomEvent() {
    const btn = document.getElementById('btn-event')
    if (!btn) return

    btn.disabled = true; btn.textContent = 'Disparando…'

    try {
        const { data, error } = await gb.events.track('Nova Compra PIX', {
            valor: 150.00,
            metodo: 'pix',
            usuario: 'playground@teste.com',
        })

        if (error) {
            log('❌', 'Erro em gb.events.track()', error)
        } else {
            log('⚡', 'gb.events.track() → OK (verifique o Dashboard!)', data)
        }
    } catch (err) {
        log('❌', 'Exceção ao disparar evento', err.message)
    } finally {
        btn.disabled = false; btn.textContent = '⚡ Disparar'
    }
}
