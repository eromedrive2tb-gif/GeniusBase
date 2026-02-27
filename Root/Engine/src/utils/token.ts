/**
 * JWT Token Utilities (Hono Native)
 * Root/Engine/src/utils/token.ts
 *
 * Uses Hono's built-in JWT utilities (HS256) — no custom crypto.
 * The file is kept at this path for backward compatibility but exports
 * standard JWT operations via `hono/jwt`.
 */

import { sign, verify } from 'hono/jwt'
import type { TokenPayload } from '../types/auth'

const TOKEN_TTL = 24 * 60 * 60 // 24 hours in seconds

/**
 * Generate a signed JWT containing tenant and user context.
 *
 * @param payload - Token payload fields (sub, tid, jti, role)
 * @param secret  - HS256 signing secret from environment
 * @returns Signed JWT string
 */
export async function generateToken(
    payload: Omit<TokenPayload, 'iat' | 'exp'>,
    secret: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    return sign(
        {
            sub: payload.sub,
            tid: payload.tid,
            jti: payload.jti,
            role: payload.role,
            iat: now,
            exp: now + TOKEN_TTL,
        },
        secret,
        'HS256'
    )
}

/**
 * Verify and decode a JWT, validating its signature and expiration.
 *
 * @param token  - The JWT string
 * @param secret - HS256 signing secret from environment
 * @returns Decoded TokenPayload
 * @throws Error on invalid signature or expired token
 */
export async function verifyToken(
    token: string,
    secret: string
): Promise<TokenPayload> {
    const decoded = await verify(token, secret, 'HS256')

    return {
        sub: decoded.sub as string,
        tid: decoded.tid as string,
        jti: decoded.jti as string,
        role: decoded.role as string,
        iat: decoded.iat as number,
        exp: decoded.exp as number,
    }
}
