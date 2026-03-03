/**
 * REST Storage Route (R2 + D1 Metadata)
 * Root/Engine/src/api/v1/storage.ts
 *
 * Responsabilidade: Upload isolado por Tenant no Cloudflare R2 e distribuição pública de binários.
 *
 * PUT /api/v1/storage/upload (apiKeyAuth): Upload e criação de Metadado no D1
 * GET /api/v1/storage/public/:id : Download público/Sem Auth baseado em ID do D1
 */

import { Hono } from 'hono'
import { createAuthRouter } from '../../utils/router'
import { apiKeyAuth } from '../../middlewares/apiKeyAuth'

const storageRoute = createAuthRouter()

export const handleStorageUpload = async (c: any) => {
    const tenantId = c.get('tenantId') as string

    // 1. Receber o form-data
    let body: any
    try {
        body = await c.req.parseBody()
    } catch {
        return c.json({ error: 'Body must be multipart/form-data' }, 400)
    }

    const file = body['file'] as File

    if (!file || !(file instanceof File)) {
        return c.json({ error: 'A file field with binary data is required' }, 400)
    }

    // 2. Metadados Extraídos do Arquivo
    const id = `fil_${crypto.randomUUID().replace(/-/g, '')}`
    const filename = file.name
    const sizeBytes = file.size
    const mimeType = file.type || 'application/octet-stream'
    // Isolamento R2: O bucketPath garante que o tenant_id seja o prefixo da pasta.
    const bucketPath = `${tenantId}/${id}-${filename}`

    // Hono Request object: URL parsing
    const origin = (new URL(c.req.url) as any).origin
    const publicUrl = `${origin}/api/v1/storage/public/${id}`

    // 3. Persistir os Bytes Físicos no R2 (Worker Binding env.R2_STORAGE)
    const arrayBuffer = await file.arrayBuffer()
    try {
        await c.env.R2_STORAGE.put(bucketPath, arrayBuffer)
    } catch (err: any) {
        console.error('R2 Put Error:', err.message)
        return c.json({ error: 'Failed to upload binary to R2' }, 502)
    }

    // 4. Persistir a referência no D1 (Metadados Relacionais)
    const now = Math.floor(Date.now() / 1000)
    try {
        await c.env.DB.prepare(
            `INSERT INTO tenant_files 
             (id, tenant_id, bucket_path, filename, mime_type, size_bytes, public_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, tenantId, bucketPath, filename, mimeType, sizeBytes, publicUrl, now)
            .run()
    } catch (err: any) {
        console.error('D1 Insert Error:', err.message)
        // Se falhar no banco, deletamos do R2 para manter integridade atômica
        await c.env.R2_STORAGE.delete(bucketPath).catch(() => { })
        return c.json({ error: 'Failed to persist metadata in database' }, 500)
    }

    return c.json({
        success: true,
        data: {
            id,
            filename,
            size_bytes: sizeBytes,
            public_url: publicUrl,
            mime_type: mimeType,
            created_at: now
        }
    }, 201)
}

// Middleware para as rotas que precisam de Auth (Upload)
storageRoute.post('/upload', apiKeyAuth, handleStorageUpload)

// Rota 100% PÚBLICA (Sem middleware de Auth) para entregar Mídia
storageRoute.get('/public/:id', async (c) => {
    const fileId = c.req.param('id')

    // 1. Identificar o ponteiro do bucket e o tipo de segurança no D1
    const metadata = await c.env.DB.prepare(
        `SELECT bucket_path, mime_type FROM tenant_files WHERE id = ?`
    ).bind(fileId).first<{ bucket_path: string, mime_type: string }>()

    if (!metadata) {
        return c.notFound()
    }

    // 2. Extrair o Binário do R2 Storage
    const object = await c.env.R2_STORAGE.get(metadata.bucket_path)

    if (object === null) {
        // Objeto órfão (existe no D1 mas sumiu do R2)
        return c.notFound()
    }

    // 3. Encaminhar para a Pipeline de Cache de Ponta (Proxy Browser)
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Content-Type', metadata.mime_type)

    // O Cache-Control injetado instrui a CDN Edge e o Navegador a reter imagens estáticas 
    headers.set('Cache-Control', 'public, max-age=31536000, immutable') // Cache por 1 ano

    return new Response(object.body, { headers })
})

export { storageRoute }
