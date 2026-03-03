-- Root/Engine/src/db/migrations/0012_customer_document.sql
-- Adicionar coluna 'document' para salvar CPF/CNPJ vinculados aos Clientes (CRM)

ALTER TABLE customers ADD COLUMN document TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);
