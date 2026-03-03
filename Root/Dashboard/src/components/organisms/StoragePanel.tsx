/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'

export const StoragePanel = () => {
    return (
        <div id="storage-panel" class="dash-panel" x-show="tab === 'storage-panel'" style="display: none;" x-data="storageController()">
            <div class="dash-panel__header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h2 class="dash-panel__title">📁 Storage do Tenant</h2>
                    <p class="dash-panel__subtitle">
                        Gerencie imagens, PDFs e arquivos mantidos de forma isolada no Cloudflare R2.<br />
                        As mídias aqui possuem URLs públicas e cacheadas via Edge Network.
                    </p>
                </div>
                <div class="action-bar" style="margin-bottom: 0px; border-bottom: none; padding-bottom: 0;">
                    {/* Botão de Upload */}
                    <button
                        type="button"
                        class="btn-outline-cyan"
                        x-on:click="$refs.fileInput.click()"
                        x-bind:disabled="uploading"
                        style="display: flex; gap: 0.5rem; align-items: center;"
                    >
                        <span x-show="!uploading" style="display: flex; gap: 0.5rem; align-items: center;">
                            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            Fazer Upload
                        </span>
                        <span x-show="uploading" style="display: flex; gap: 0.5rem; align-items: center;" x-cloak>
                            <svg style="width: 16px; height: 16px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Enviando...
                        </span>
                    </button>
                    {/* Input arquivo real escondido */}
                    <input
                        type="file"
                        x-ref="fileInput"
                        style="display: none;"
                        x-on:change="handleUpload($event)"
                        accept="image/*,application/pdf"
                    />
                </div>
            </div>

            {/* Empty State */}
            <div x-show="files.length === 0 && !loading" style="text-align: center; padding: 4rem 1rem; background: rgba(0,0,0,0.2); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; margin: 1.5rem;" x-cloak>
                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg style="width: 32px; height: 32px; color: #64748b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
                    </svg>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 500; color: #f8fafc; margin-bottom: 0.25rem;">Nenhum Arquivo Encontrado</h3>
                <p style="color: #94a3b8; font-size: 0.9rem;">Faça o upload da sua primeira mídia para armazená-la no R2.</p>
            </div>

            {/* Grid State */}
            <div x-show="files.length > 0" class="table-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; padding: 1.5rem; border: none; background: transparent;" x-cloak>
                <template {...{ 'x-for': 'file in files', ':key': 'file.id' }}>
                    <div style="background: var(--gb-bg-card); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; transition: border-color 0.2s; position: relative;"
                         x-on:mouseenter="hoverId = file.id" x-on:mouseleave="hoverId = null">
                        
                        {/* Imagem Preview vs Icon */}
                        <div style="height: 140px; width: 100%; background: #000; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; position: relative;">
                            {/* É imagem? */}
                            <template x-if="file.mime_type.startsWith('image/')">
                                <img x-bind:src="file.public_url" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
                            </template>
                            
                            {/* É arquivo (PDF, etc)? */}
                            <template x-if="!file.mime_type.startsWith('image/')">
                                <svg style="width: 48px; height: 48px; color: #475569;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </template>
                            
                            {/* Hover Overlay de Ações */}
                            <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; gap: 1rem; transition: opacity 0.2s;"
                                 x-bind:style="hoverId === file.id ? 'opacity: 1;' : 'opacity: 0; pointer-events: none;'">
                                <a x-bind:href="file.public_url" target="_blank" style="padding: 0.5rem; background: rgba(255,255,255,0.1); color: #fff; border-radius: 50%; display: flex;" title="Abrir em Nova Aba">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                                <button x-on:click="navigator.clipboard.writeText(file.public_url); alert('Link copiado!')" style="padding: 0.5rem; background: rgba(6, 182, 212, 0.2); color: #06b6d4; border-radius: 50%; display: flex; border: none; cursor: pointer;" title="Copiar Link">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                </button>
                                <button x-on:click="deleteFile(file.id)" style="padding: 0.5rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 50%; display: flex; border: none; cursor: pointer;" title="Excluir">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>

                        {/* Metadados Info */}
                        <div style="padding: 0.75rem;">
                            <p style="font-size: 0.85rem; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 0.25rem 0;" x-text="file.filename"></p>
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
                                <span style="text-transform: uppercase; font-weight: 600;" x-text="file.mime_type.split('/')[1] || 'FILE'"></span>
                                <span x-text="(file.size_bytes / 1024).toFixed(1) + ' KB'"></span>
                            </div>
                        </div>

                    </div>
                </template>
            </div>
            
            {/* Alpine Logic Script (Client Side) */}
            <script dangerouslySetInnerHTML={{ __html: `
function storageController() {
    return {
        files: [],
        loading: true,
        uploading: false,
        hoverId: null,

        init() {
            // Guarantee fetching the files from the database (Single Source of Truth) at panel load
            this.loadFiles()
            
            // Listen to parent x-data 'tab' changes
            this.$watch('tab', (value) => {
                if (value === 'storage-panel') {
                    this.loadFiles()
                }
            })
        },

        async loadFiles() {
            this.loading = true
            try {
                const data = await window.rpc.request('FETCH_FILES', {})
                this.files = data || []
            } catch (err) {
                console.error('Erro ao carregar arquivos:', err)
                this.files = []
            } finally {
                this.loading = false
            }
        },

        async deleteFile(id) {
            if (!confirm('Tem certeza que deseja apagar fisicamente este arquivo? Isso quebrará links externos.')) return

            try {
                await window.rpc.request('DELETE_FILE', { id })
                // Remove do array local reativamente
                this.files = this.files.filter(f => f.id !== id)
            } catch (err) {
                alert('Falha ao excluir o arquivo: ' + err.message)
            }
        },

        async handleUpload(event) {
            const fileInput = event.target
            const file = fileInput.files[0]
            if (!file) return

            this.uploading = true

            try {
                const formData = new FormData()
                formData.append('file', file)

                const response = await fetch('/api/internal/storage/upload', {
                    method: 'POST',
                    body: formData
                })

                const json = await response.json()

                if (!response.ok) {
                    alert('Falha no Upload: ' + (json.error || response.statusText))
                    return
                }

                // Reset input and sync with database (Single Source of Truth)
                fileInput.value = ''
                await this.loadFiles()

            } catch (err) {
                console.error('Upload catch error:', err)
                alert('Ocorreu um erro crítico durante o envio.')
            } finally {
                this.uploading = false
            }
        }
    }
}
`}} />
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    )
}
