-- ============================================================
-- Migration 0001: Multi-Tenant Authentication Schema
-- GeniusBase Mini-Supabase
-- ============================================================

-- Tenants table: Each tenant represents an isolated organization
CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    api_key_prefix TEXT UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table: Scoped by tenant_id for logical data isolation
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Prevent duplicate emails within the same tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email
    ON users(tenant_id, email);

-- Fast lookup by tenant_id for scoped queries
CREATE INDEX IF NOT EXISTS idx_users_tenant_id
    ON users(tenant_id);

-- Audit log for EDA: records auth events in background
CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    user_id     TEXT,
    event_type  TEXT NOT NULL,
    ip_address  TEXT,
    user_agent  TEXT,
    metadata    TEXT, -- JSON string for flexible extra data
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fast lookup of audit events by tenant
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id
    ON audit_log(tenant_id);

-- Fast lookup of audit events by type
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
    ON audit_log(event_type);
