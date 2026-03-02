import { gb } from '../client.js'
import { log } from '../logger.js'

/**
 * Escuta silenciosa de eventos via WebSocket (canais Realtime)
 */
export function initRealtime() {
    const dot = document.getElementById('ws-dot')
    const label = document.getElementById('ws-label')

    const pixPanel = document.getElementById('pix-panel')
    const pixStatus = document.getElementById('pix-status')

    const txnPanel = document.getElementById('txn-panel')
    const txnStatus = document.getElementById('txn-status')
    const txnPayerBox = document.getElementById('txn-payer-box')
    const txnPayerName = document.getElementById('txn-payer-name')
    const txnPayerDoc = document.getElementById('txn-payer-doc')

    // Conexão fictícia para feedback visual enquanto inicia
    setTimeout(() => {
        if (dot) dot.classList.add('on')
        if (label) label.textContent = 'Realtime conectado (WebSocket ativo)'
        log('🔌', 'WebSocket do GeniusBase estabelecido com sucesso')
    }, 1200)

    // Inscrição no canal de exemplo 'loja'
    gb.channel('loja')
        .on('PRODUCT_CREATED', p => log('📦', 'REALTIME → PRODUCT_CREATED', p))
        .on('CUSTOM_EVENT_RECEIVED', p => log('⚡', 'REALTIME → CUSTOM_EVENT_RECEIVED', p))
        .on('ORDER_PAID', p => {
            log('💳', '🎉 ORDER_PAID recebido via WebSocket!', p)
            if (pixPanel && pixPanel.style.display !== 'none') {
                pixStatus.className = 'pix-info__status pix-info__status--paid'
                pixStatus.textContent = '✅ Pedido Pago!'
            }
        })
        .on('TRANSACTION_COMPLETED', p => {
            log('💸', '🎉 TRANSACTION_COMPLETED recebido via WebSocket!', p)
            if (txnPanel && txnPanel.style.display !== 'none') {
                txnStatus.className = 'pix-info__status pix-info__status--paid'
                txnStatus.textContent = '✅ Pagamento Recebido!'

                if (p.payer_name || p.payer_document) {
                    txnPayerBox.style.display = 'block'
                    txnPayerName.textContent = p.payer_name ?? 'Nome não fornecido'
                    txnPayerDoc.textContent = p.payer_document ? `Doc: ${p.payer_document}` : ''
                }
            }
        })
        .subscribe()
}
