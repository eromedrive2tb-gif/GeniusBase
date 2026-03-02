-- Alterando tenant_transactions para referenciar customers
ALTER TABLE tenant_transactions ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

-- Criando índices de performance para consultas de relacionamento
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON tenant_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON tenant_orders(customer_id);
