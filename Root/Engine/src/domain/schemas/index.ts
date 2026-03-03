/**
 * Domain Validation Schemas (Zod)
 * Root/Engine/src/domain/schemas/index.ts
 *
 * Centralizes all strict payload validation rules to prevent
 * invalid or malicious data from reaching the Repositories.
 */

import { z } from 'zod'

// ── Authentication ──────────────────────────────────────────

export const AuthRegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
})

export const AuthLoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

// ── Customers ───────────────────────────────────────────────

export const CustomerCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address').optional().nullable(),
    document: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
})

// ── Products ────────────────────────────────────────────────

export const ProductCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    price: z.number().int().nonnegative('Price must be a non-negative integer (cents)'),
    stock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
})

// ── Transactions (Standalone PIX) ───────────────────────────

export const TransactionCreateSchema = z.object({
    amount: z.number().int().positive('Amount must be a positive integer (cents)'),
    provider: z.string().min(1, 'Provider name is required'),
    customer_id: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
})

// ── Orders (E-commerce Checkout) ────────────────────────────

export const OrderItemSchema = z.object({
    product_id: z.string().min(1, 'product_id is required'),
    quantity: z.number().int().positive('Quantity must be at least 1'),
})

export const OrderCreateSchema = z.object({
    provider: z.string().min(1, 'Provider name is required'),
    customer_id: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
    items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
})
