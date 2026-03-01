-- Migration: 0006_tenant_gateways.sql
-- Description: Per-tenant payment gateway credential storage.
--              Each Tenant registers their own gateway credentials (e.g. OpenPix App ID).
--              Credentials are stored as JSON TEXT (encrypted at rest in Cloudflare D1).
--              UNIQUE(tenant_id, provider) ensures one active credential set per gateway.

CREATE TABLE IF NOT EXISTS tenant_gateways (
    id          TEXT    PRIMARY KEY,
    tenant_id   TEXT    NOT NULL,
    provider    TEXT    NOT NULL,         -- 'openpix' | 'stripe' | ...
    credentials TEXT    NOT NULL,         -- JSON: { "appId": "..." }
    is_active   INTEGER NOT NULL DEFAULT 1,
    updated_at  INTEGER NOT NULL,
    UNIQUE(tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_tenant_gateways_tenant_id
    ON tenant_gateways(tenant_id);
