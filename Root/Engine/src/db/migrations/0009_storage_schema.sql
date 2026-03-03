-- Root/Engine/src/db/migrations/0009_storage_schema.sql
-- Adiciona a tabela de armazenamento de arquivos (Metadados Cloudflare R2)

CREATE TABLE IF NOT EXISTS tenant_files (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bucket_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    public_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indice para listagem via RPC (Dashboard) acelerada pelo tenant_id
CREATE INDEX IF NOT EXISTS idx_tenant_files_tenant_id ON tenant_files(tenant_id);
