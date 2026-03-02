import { isConfigured } from './client.js'
import { log, clearLog } from './logger.js'
import { insertProduct, fetchProducts, getFirstProductId } from './actions/database.js?v=2'
import { runCheckout, createStandaloneTransaction, simulateWebhook, resetCheckout, resetTxn } from './actions/payments.js?v=2'
import { trackCustomEvent } from './actions/telemetry.js?v=2'
import { initRealtime } from './actions/realtime.js?v=2'

// ── Inicia Realtime automaticamente ───────────────────
initRealtime()

// ── Registro de Eventos da UI ─────────────────────────

// Exibe aviso se API Key não estiver configurada
if (!isConfigured) {
    const warn = document.getElementById('warn-key')
    if (warn) warn.style.display = 'block'
}

// Database — Inserção
document.getElementById('btn-insert')?.addEventListener('click', insertProduct)

// Database — Consulta
document.getElementById('btn-fetch')?.addEventListener('click', fetchProducts)

// Telemetria — Eventos
document.getElementById('btn-event')?.addEventListener('click', trackCustomEvent)

// Pagamento — Checkout de Carrinho
document.getElementById('btn-pix')?.addEventListener('click', async () => {
    const productId = await getFirstProductId()
    await runCheckout(productId, false)
})

// Pagamento — Checkout Vinculado ao App/CRM
document.getElementById('btn-pix-crm')?.addEventListener('click', async () => {
    const productId = await getFirstProductId()
    await runCheckout(productId, true)
})

// Pagamento — Transação Direta
document.getElementById('btn-txn')?.addEventListener('click', async () => {
    const val = parseInt(document.getElementById('txn-amount').value, 10)
    if (isNaN(val) || val <= 0) {
        log('⚠️', 'Insira um valor válido!')
        return
    }
    await createStandaloneTransaction(val * 100)
})

// Webhook Simulado — Pedido
document.getElementById('btn-simulate-webhook')?.addEventListener('click', () => {
    simulateWebhook('ORDER')
})

// Webhook Simulado — Transação
document.getElementById('btn-simulate-txn-webhook')?.addEventListener('click', () => {
    simulateWebhook('TRANSACTION')
})

// UI — Copiar BrCode (Carrinho)
document.getElementById('btn-copy-brcode')?.addEventListener('click', () => {
    const code = document.getElementById('pix-brcode').textContent
    if (code && code !== '—') {
        navigator.clipboard.writeText(code).then(() => log('📋', 'brCode copiado!'))
    }
})

// UI — Copiar BrCode (Transação)
document.getElementById('btn-copy-txn-brcode')?.addEventListener('click', () => {
    const code = document.getElementById('txn-brcode').textContent
    if (code && code !== '—') {
        navigator.clipboard.writeText(code).then(() => log('📋', 'brCode copiado!'))
    }
})

// UI — Limpar Log
document.getElementById('btn-clear')?.addEventListener('click', clearLog)

// UI — Reset Panels
document.getElementById('btn-pix-reset')?.addEventListener('click', resetCheckout)
document.getElementById('btn-txn-reset')?.addEventListener('click', resetTxn)
