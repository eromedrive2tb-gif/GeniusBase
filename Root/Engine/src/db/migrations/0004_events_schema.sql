-- Migration: 0004_events_schema.sql
-- Description: Creates the tenant_events table for Igor — the custom telemetry module.
--              Stores arbitrary JSON payloads dispatched by Tenant apps via POST /api/v1/events.

CREATE TABLE IF NOT EXISTS tenant_events (
    id         TEXT    PRIMARY KEY,
    tenant_id  TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    payload    TEXT,   -- Raw JSON string; parsed back to object on reads
    created_at INTEGER NOT NULL
);

-- Fast scoped lookup (all selects filter by tenant_id + order by created_at)
CREATE INDEX IF NOT EXISTS idx_tenant_events_tenant_id
    ON tenant_events(tenant_id);

-- Composite index for the common access pattern: tenant + recency
CREATE INDEX IF NOT EXISTS idx_tenant_events_tenant_created
    ON tenant_events(tenant_id, created_at DESC);
