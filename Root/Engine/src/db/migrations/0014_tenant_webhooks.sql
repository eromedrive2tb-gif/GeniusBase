-- Root/Engine/src/db/migrations/0014_tenant_webhooks.sql
-- Tabela para armazenar webhooks avançados EDA de Lojistas

CREATE TABLE tenant_webhooks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON Array, ex: ["*"] ou ["ORDER_PAID", "CUSTOMER_CREATED"]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_webhooks ON tenant_webhooks(tenant_id);
