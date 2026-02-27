/**
 * Password Hashing Utilities (Web Crypto API)
 * Root/Engine/src/utils/crypto.ts
 *
 * Uses PBKDF2 with SHA-256 (100k iterations) — fully supported
 * by the Cloudflare Workers runtime without external dependencies.
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16 // bytes
const HASH_LENGTH = 32 // bytes (256 bits)

/**
 * Convert an ArrayBuffer to a hex string.
 */
function bufToHex(buf: ArrayBuffer): string {
    return [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

/**
 * Convert a hex string to a Uint8Array.
 */
function hexToBuf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
}

/**
 * Derive a key from a password and salt using PBKDF2-SHA256.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    )

    return crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        HASH_LENGTH * 8 // bits
    )
}

/**
 * Hash a password using PBKDF2-SHA256.
 * Returns a string in the format `salt:hash` (hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = new Uint8Array(SALT_LENGTH)
    crypto.getRandomValues(salt)

    const derivedBits = await deriveKey(password, salt)

    return `${bufToHex(salt.buffer as ArrayBuffer)}:${bufToHex(derivedBits)}`
}

/**
 * Verify a password against a stored `salt:hash` string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
    password: string,
    storedHash: string
): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':')
    if (!saltHex || !hashHex) return false

    const salt = hexToBuf(saltHex)
    const derivedBits = await deriveKey(password, salt)
    const derivedHex = bufToHex(derivedBits)

    // Constant-time comparison
    if (derivedHex.length !== hashHex.length) return false

    let result = 0
    for (let i = 0; i < derivedHex.length; i++) {
        result |= derivedHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
    }

    return result === 0
}
