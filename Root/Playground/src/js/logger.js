const logEl = document.getElementById('log')

/**
 * Registra uma mensagem no console visual do Playground
 * @param {string} icon - Emoji para identificar o tipo de ação
 * @param {string} msg - Mensagem descritiva
 * @param {any} [data] - Dados opcionais (JSON) para exibir
 */
export function log(icon, msg, data) {
    if (!logEl) return

    const time = new Date().toLocaleTimeString('pt-BR')
    const body = data !== undefined
        ? '\n    ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n    ')
        : ''

    logEl.textContent += `\n[${time}] ${icon} ${msg}${body}\n`
    logEl.scrollTop = logEl.scrollHeight
}

export function clearLog() {
    if (logEl) logEl.textContent = 'Log limpo.\n'
}
