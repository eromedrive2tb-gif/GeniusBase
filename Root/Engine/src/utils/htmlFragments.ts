/**
 * HTML Fragment Helpers
 * Root/Engine/src/utils/htmlFragments.ts
 *
 * Responsabilidade única: gerar fragmentos HTML reutilizáveis
 * para respostas HTMX (alerts de erro e sucesso).
 */

export const errorAlert = (msg: string): string =>
    `<div class="alert alert-error" role="alert">${escapeHtml(msg)}</div>`

export const successAlert = (msg: string): string =>
    `<div class="alert alert-success" role="alert">${escapeHtml(msg)}</div>`

/**
 * Escape HTML para prevenir XSS em mensagens dinâmicas.
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
