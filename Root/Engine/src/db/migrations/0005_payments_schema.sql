-- Migration: 0005_payments_schema.sql
-- Description: Creates the tenant_charges table for the agnostic payment engine.
--              Tracks payment intents and their lifecycle (PENDING → COMPLETED | FAILED)
--              across multiple gateways (e.g. openpix, stripe) with data isolation by tenant.

CREATE TABLE IF NOT EXISTS tenant_charges (
    id                 TEXT    PRIMARY KEY,
    tenant_id          TEXT    NOT NULL,
    provider           TEXT    NOT NULL,          -- 'openpix' | 'stripe' | ...
    provider_charge_id TEXT    NOT NULL,          -- correlationID / paymentIntent.id
    amount             INTEGER NOT NULL,          -- em centavos (100 = R$1,00)
    status             TEXT    NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | FAILED
    metadata           TEXT,                      -- JSON bruto enviado pelo Tenant
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL
);

-- Fast per-tenant listing
CREATE INDEX IF NOT EXISTS idx_tenant_charges_tenant_id
    ON tenant_charges(tenant_id);

-- Webhook lookup by provider charge ID (must be fast — webhook fires at payment time)
CREATE INDEX IF NOT EXISTS idx_tenant_charges_provider_id
    ON tenant_charges(provider_charge_id);
