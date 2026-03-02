-- Root/Engine/0008_standalone_transactions.sql
-- Fase 15: Transações Avulsas e Enriquecimento de Dados

-- O SQLite não suporta ALTER COLUMN para remover NOT NULL.
-- Devemos usar a técnica de 12-passos (recriar e copiar).

PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS new_tenant_transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT, -- AGORA É OPCIONAL (NULLABLE)
    provider TEXT NOT NULL,
    provider_transaction_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payer_name TEXT,     -- NOVO: Nome de quem pagou
    payer_document TEXT, -- NOVO: CPF/CNPJ de quem pagou
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES tenant_orders(id) ON DELETE CASCADE
);

-- Copiar dados antigos (colunas novas ficarão preenchidas com NULL automaticamente)
INSERT INTO new_tenant_transactions (id, tenant_id, order_id, provider, provider_transaction_id, amount, payment_method, status, metadata, created_at)
SELECT id, tenant_id, order_id, provider, provider_transaction_id, amount, payment_method, status, metadata, created_at 
FROM tenant_transactions;

DROP TABLE tenant_transactions;
ALTER TABLE new_tenant_transactions RENAME TO tenant_transactions;

-- Recriar índices críticos da tabela
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON tenant_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON tenant_transactions(tenant_id);

PRAGMA foreign_keys=on;
