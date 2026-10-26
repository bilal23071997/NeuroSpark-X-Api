import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for the Stripe keys kept in the database. The key comes from the
 * environment (never the database), so a leaked database dump alone cannot
 * reveal them. Format: base64(iv).base64(auth tag).base64(ciphertext).
 */
export function encryptSecret(plain: string, passphrase: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.');
}

export function decryptSecret(stored: string, passphrase: string) {
  const [iv, tag, body] = stored.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

/** `sk_test_51Abc…wxyz` becomes `sk_test_••••wxyz`: enough to recognise, useless to steal. */
export function maskSecret(secret: string) {
  const prefix = /^[a-z]{2}_(?:test|live)_/.exec(secret)?.[0] ?? '';
  return `${prefix}••••${secret.slice(-4)}`;
}

function deriveKey(passphrase: string) {
  return createHash('sha256').update(passphrase).digest();
}
