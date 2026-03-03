-- Root/Engine/src/db/migrations/0011_add_metadata_columns.sql
-- Adicionar campos de Metafields (JSON Dinâmico) às entidades centrais
ALTER TABLE products ADD COLUMN metadata TEXT;
ALTER TABLE customers ADD COLUMN metadata TEXT;
ALTER TABLE tenant_orders ADD COLUMN metadata TEXT;
