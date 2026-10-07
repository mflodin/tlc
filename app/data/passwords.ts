import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// Hashes look like "scrypt$<N>$<r>$<p>$<salt>$<hash>" (base64), so parameters can change later
// without breaking existing hashes.
const PARAMS = { N: 2 ** 15, r: 8, p: 1 }
const KEY_LENGTH = 32
const MAX_MEMORY = 64 * 1024 * 1024

export const MIN_PASSWORD_LENGTH = 10

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, { ...options, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  let salt = randomBytes(16)
  let key = await derive(password, salt, PARAMS)
  let { N, r, p } = PARAMS
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  let [scheme, N, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  let expected = Buffer.from(hash, 'base64')
  let key = await derive(password, Buffer.from(salt, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** A random 16-character password, for new accounts and resets from the CLI. */
export function generatePassword(): string {
  return randomBytes(12).toString('base64url')
}
