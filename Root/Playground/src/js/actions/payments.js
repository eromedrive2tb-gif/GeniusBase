import { gb, GB_URL } from '../client.js'
import { log } from '../logger.js'

/**
 * Funções de exemplo para uso do módulo de Pagamentos (PIX / Orders)
 */

// Estado interno para rastrear a última cobrança
export let currentOrder = {
    id: null,
    providerId: null,
    amount: 0,
}

export let currentTxn = {
    id: null,
    providerId: null,
    amount: 0,
}

const pixPanel = document.getElementById('pix-panel')
const pixStatus = document.getElementById('pix-status')
const pixCorrelation = document.getElementById('pix-correlation')
const pixBrcode = document.getElementById('pix-brcode')
const pixQrImg = document.getElementById('pix-qr-img')
const pixLink = document.getElementById('pix-link')

const txnPanel = document.getElementById('txn-panel')
const txnStatus = document.getElementById('txn-status')
const txnIdVal = document.getElementById('txn-id-val')
const txnBrcode = document.getElementById('txn-brcode')
const txnQrImg = document.getElementById('txn-qr-img')
const txnLink = document.getElementById('txn-link')
const txnPayerBox = document.getElementById('txn-payer-box')

/**
 * Finaliza Checkout (Gera Cobrança para um Pedido)
 */
export async function runCheckout(productId, isCrm = false) {
    const btnId = isCrm ? 'btn-pix-crm' : 'btn-pix'
    const btn = document.getElementById(btnId)
    if (!btn) return

    if (!productId) {
        log('⚠️', 'Nenhum produto disponível. Crie um produto primeiro.')
        return
    }

    btn.disabled = true; btn.textContent = 'Gerando…'

    try {
        let customerId = undefined;
        if (isCrm) {
            log('⏳', 'Buscando cliente no CRM...')
            const { data: customers } = await gb.from('customers').select()
            if (customers && customers.length > 0) {
                customerId = customers[0].id
                log('👤', `Cliente encontrado: ${customers[0].name} (${customerId})`)
            } else {
                log('⏳', 'Nenhum cliente existe. Criando novo cliente no CRM...')
                const { data: newCustomer } = await gb.from('customers').insert({
                    name: 'João CRM Testador',
                    email: 'joaocrm@playground.com'
                })
                customerId = newCustomer.id
                log('👤', `Novo cliente criado: João CRM Testador (${customerId})`)
            }
        }

        const checkoutPayload = {
            items: [{ product_id: productId, quantity: 1 }],
            provider: 'openpix',
        }
        if (customerId) checkoutPayload.customer_id = customerId

        const { data, error } = await gb.orders.checkout(checkoutPayload)

        if (error) {
            log('❌', 'Erro em gb.orders.checkout()', error)
            return
        }

        // Atualiza estado local
        currentOrder.id = data.order_id
        currentOrder.amount = data.total_amount

        log('🛍', `✅ PEDIDO CRIADO! ID: ${data.order_id} | Total: R$ ${(data.total_amount / 100).toFixed(2)}`)

        // Atualiza UI
        pixCorrelation.textContent = data.order_id ?? '—'
        if (data.brCode) {
            pixBrcode.textContent = data.brCode
            pixQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data.brCode)}`
        }

        if (data.paymentLinkUrl) {
            pixLink.href = data.paymentLinkUrl
            pixLink.style.display = 'inline-block'
        } else {
            pixLink.style.display = 'none'
        }

        pixStatus.className = 'pix-info__status pix-info__status--pending'
        pixStatus.textContent = '⏳ Aguardando Pagamento'
        pixPanel.style.display = 'block'

    } catch (err) {
        log('❌', 'Exceção em gb.orders.checkout()', err.message)
    } finally {
        btn.disabled = false; btn.textContent = isCrm ? '🛍 Checkout (CRM)' : '🛒 Checkout PIX'
    }
}

/**
 * Gera Transação Avulsa (Doação / PIX Direto)
 */
export async function createStandaloneTransaction(amountCents) {
    const btn = document.getElementById('btn-txn')
    if (!btn) return

    btn.disabled = true; btn.textContent = 'Gerando…'

    try {
        const { data, error } = await gb.transactions.create({
            amount: amountCents,
            provider: 'openpix',
        })

        if (error) {
            log('❌', 'Erro em gb.transactions.create()', error)
            return
        }

        // Atualiza estado local
        currentTxn.id = data.transaction_id
        currentTxn.providerId = data.provider_transaction_id
        currentTxn.amount = data.amount

        log('💸', `✅ TRANSAÇÃO CRIADA! ID: ${data.transaction_id} | Total: R$ ${(data.amount / 100).toFixed(2)}`)

        // Atualiza UI
        txnIdVal.textContent = data.transaction_id
        if (data.brCode) {
            txnBrcode.textContent = data.brCode
            txnQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data.brCode)}`
        }

        if (data.paymentLinkUrl) {
            txnLink.href = data.paymentLinkUrl
            txnLink.style.display = 'inline-block'
        }

        txnStatus.className = 'pix-info__status pix-info__status--pending'
        txnStatus.textContent = '⏳ Aguardando Pagamento'
        txnPanel.style.display = 'block'
        txnPayerBox.style.display = 'none'

    } catch (err) {
        log('❌', 'Exceção em gb.transactions.create()', err.message)
    } finally {
        btn.disabled = false; btn.textContent = '💸 Gerar PIX'
    }
}

/**
 * Simula webhook de pagamento aprovado vindo do provedor (Ex: Woovi/OpenPix)
 */
export async function simulateWebhook(eventType) {
    const isOrder = eventType === 'ORDER'
    const idToSimulate = isOrder ? currentOrder.id : (currentTxn.providerId || currentTxn.id)
    const amount = isOrder ? currentOrder.amount : currentTxn.amount

    if (!idToSimulate) {
        log('⚠️', 'Nenhuma cobrança ativa para simular webhook.')
        return
    }

    log('🟣', `Simulando webhook para ${isOrder ? 'Pedido' : 'Transação'} ID: ${idToSimulate}`)

    try {
        const payload = {
            event: 'OPENPIX:CHARGE_COMPLETED',
            charge: {
                correlationID: idToSimulate,
                status: 'COMPLETED',
                value: amount,
                customer: {
                    name: "João Silva Sauro (Simulado)",
                    taxID: { taxID: "123.456.789-00", type: "BR:CPF" }
                }
            }
        }

        const res = await fetch(`${GB_URL}/api/v1/payments/webhooks/openpix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const body = await res.json()
        log('🟣', `Webhook enviado (Status: ${res.status})`, body)

    } catch (err) {
        log('❌', 'Erro ao enviar webhook simulado', err.message)
    }
}

export function resetCheckout() {
    pixPanel.style.display = 'none'
    currentOrder.id = null
    pixQrImg.src = ''
}

export function resetTxn() {
    txnPanel.style.display = 'none'
    currentTxn.id = null
    currentTxn.providerId = null
    txnPayerBox.style.display = 'none'
    txnQrImg.src = ''
}
