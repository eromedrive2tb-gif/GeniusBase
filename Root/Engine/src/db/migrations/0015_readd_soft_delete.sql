-- Root/Engine/src/db/migrations/0015_readd_soft_delete.sql
-- Essa migração recompõe o Soft Delete nas tabelas de Produtos e Clientes
-- que estava ausente no ambiente local (causava INTERNAL SERVER ERROR na busca).
ALTER TABLE products ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE customers ADD COLUMN deleted_at DATETIME DEFAULT NULL;
