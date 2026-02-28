-- Migration: 0003_enduser_auth_schema.sql
-- Description: Creates the tenant_users table for external end-user authentication isolated by tenant.

CREATE TABLE IF NOT EXISTS tenant_users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Ensure an email can only be registered once per tenant (but same email can exist across different tenants)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_tenant_email
    ON tenant_users(tenant_id, email);

-- Fast lookup by tenant_id for scoped queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id
    ON tenant_users(tenant_id);
