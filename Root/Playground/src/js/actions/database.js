import { gb } from '../client.js'
import { log } from '../logger.js'

/**
 * Funções de exemplo para uso do módulo Database
 */
export async function insertProduct() {
    const btn = document.getElementById('btn-insert')
    if (!btn) return

    btn.disabled = true; btn.textContent = 'Criando…'

    try {
        const { data, error } = await gb.from('products').insert({
            name: `Produto Playground #${Math.floor(Math.random() * 9000 + 1000)}`,
            price: 9900,
            stock: 10,
        })

        if (error) log('❌', 'Erro em gb.from().insert()', error)
        else log('✅', 'gb.from("products").insert() → OK', data)
    } catch (err) {
        log('❌', 'Exceção ao inserir produto', err.message)
    } finally {
        btn.disabled = false; btn.textContent = '⚡ Executar'
    }
}

export async function fetchProducts() {
    const btn = document.getElementById('btn-fetch')
    if (!btn) return

    btn.disabled = true; btn.textContent = 'Buscando…'

    try {
        const { data, error } = await gb.from('products').select()

        if (error) {
            log('❌', 'Erro em gb.from().select()', error)
        } else {
            const count = Array.isArray(data) ? data.length : 0
            const preview = Array.isArray(data) ? data.slice(0, 2) : data
            log('📌', `gb.from("products").select() → ${count} produto(s)`, preview)
        }
    } catch (err) {
        log('❌', 'Exceção ao buscar produtos', err.message)
    } finally {
        btn.disabled = false; btn.textContent = '📋 Executar'
    }
}

// Utility to get the first product ID for demo purposes
export async function getFirstProductId() {
    const { data, error } = await gb.from('products').select()
    if (error) {
        log('❌', 'Erro ao buscar produtos base:', error)
        return null
    }
    if (Array.isArray(data) && data.length > 0) return data[0].id
    return null
}
