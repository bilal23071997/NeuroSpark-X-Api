import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret } from './secret-box.js';

describe('secret-box', () => {
  it('round-trips and never stores the plain text', () => {
    const stored = encryptSecret('sk_test_abc123', 'passphrase');
    expect(stored).not.toContain('sk_test_abc123');
    expect(decryptSecret(stored, 'passphrase')).toBe('sk_test_abc123');
  });

  it('uses a fresh iv each time', () => {
    expect(encryptSecret('x', 'p')).not.toBe(encryptSecret('x', 'p'));
  });

  it('rejects a wrong passphrase or tampered data', () => {
    const stored = encryptSecret('sk_test_abc123', 'passphrase');
    expect(() => decryptSecret(stored, 'other')).toThrow();
    const [iv, tag, body] = stored.split('.');
    expect(() => decryptSecret([iv, tag, Buffer.from('zz').toString('base64')].join('.'), 'passphrase')).toThrow();
    expect(body).toBeTruthy();
  });

  it('masks all but the last four characters', () => {
    expect(maskSecret('sk_test_51AbcdefWXYZ')).toBe('sk_test_••••WXYZ');
    expect(maskSecret('whsec_abcdefgh1234')).toBe('••••1234');
  });
});
