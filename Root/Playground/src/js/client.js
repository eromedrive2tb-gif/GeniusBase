import { createClient } from '../../SDK/dist/index.js'

// ────────────────────────────────────────────────────
// CONFIGURAÇÃO
// ────────────────────────────────────────────────────
const GB_URL = 'https://geniusbase.vitrine.top'
// A KEY abaixo é uma Service Key para testes locais no Playground.
// Em produção, os tenants usariam suas próprias keys.
const SERVICE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyZmI5NDc1My1kZWIwLTRmNzgtODBhMy0xZmZkMjBkN2MyZTciLCJ0aWQiOiJ0X2Q0MjQzZGI2OGJlZiIsImp0aSI6ImE2N2NhYjkwLWJiOGUtNDlhMy04Mzg5LTdhNmQ1Zjk4MjFjYiIsInJvbGUiOiJzZXJ2aWNlIiwiaWF0IjoxNzcyMzQwNTYzLCJleHAiOjE4MDM4NzY1NjN9.ahXunrZFEj_Ig6jsjojYbvb1fXuF4gYeaNBE57HvBJU'
// ────────────────────────────────────────────────────

export const gb = createClient(GB_URL, SERVICE_API_KEY)

export const isConfigured = !SERVICE_API_KEY.startsWith('COLE')
export { GB_URL }
