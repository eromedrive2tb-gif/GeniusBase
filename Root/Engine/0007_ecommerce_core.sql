-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 0007: E-commerce Core — Orders, Order Items, Transactions
-- Root/Engine/0007_ecommerce_core.sql
--
-- Replaces the flat tenant_charges model with a fully relational e-commerce
-- schema that associates payments to structured orders and line items.
-- tenant_charges is preserved (not dropped) to keep Phase 12 data intact.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── Pedidos (Orders) ────────────────────────────────────────────────────────
-- Tracks the full lifecycle of a customer purchase.
-- status: PENDING → PAID → SHIPPED → CANCELED
CREATE TABLE IF NOT EXISTS tenant_orders (
    id           TEXT    PRIMARY KEY,                     -- e.g. ord_<uuid>
    tenant_id    TEXT    NOT NULL,
    customer_id  TEXT,                                    -- optional: links to tenant_users
    status       TEXT    NOT NULL DEFAULT 'PENDING',      -- PENDING | PAID | SHIPPED | CANCELED
    total_amount INTEGER NOT NULL,                        -- in cents (price locked at checkout)
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_orders_tenant_id
    ON tenant_orders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_orders_status
    ON tenant_orders(tenant_id, status);

-- ─── Itens do Pedido (Order Items) ───────────────────────────────────────────
-- Line items: one row per product×quantity pair inside an order.
-- price_at_time is frozen from the catalogue at checkout — never recalculated.
CREATE TABLE IF NOT EXISTS tenant_order_items (
    id            TEXT    PRIMARY KEY,                    -- e.g. oi_<uuid>
    order_id      TEXT    NOT NULL,
    product_id    TEXT    NOT NULL,
    quantity      INTEGER NOT NULL CHECK(quantity > 0),
    price_at_time INTEGER NOT NULL CHECK(price_at_time >= 0),  -- cents
    FOREIGN KEY (order_id) REFERENCES tenant_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON tenant_order_items(order_id);

-- ─── Transações (Transactions) ───────────────────────────────────────────────
-- One payment attempt per order. Supports future multi-payment retries.
-- provider_transaction_id = correlationID sent to the gateway (= order_id).
CREATE TABLE IF NOT EXISTS tenant_transactions (
    id                     TEXT    PRIMARY KEY,           -- e.g. txn_<uuid>
    tenant_id              TEXT    NOT NULL,
    order_id               TEXT    NOT NULL,
    provider               TEXT    NOT NULL,              -- 'openpix' | 'stripe' | ...
    provider_transaction_id TEXT   NOT NULL,              -- correlationID / gateway charge ID
    amount                 INTEGER NOT NULL,              -- cents
    payment_method         TEXT    NOT NULL DEFAULT 'PIX', -- 'PIX' | 'CREDIT_CARD' | ...
    status                 TEXT    NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | FAILED
    metadata               TEXT,                         -- JSON blob
    created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES tenant_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_id
    ON tenant_transactions(provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_order
    ON tenant_transactions(tenant_id, order_id);
