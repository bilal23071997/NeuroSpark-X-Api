import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real presigner would sign locally with fake keys; mocking it lets the test
// see exactly which object (bucket, key, type, length) would be signed.
const signed: { input: Record<string, unknown> }[] = [];
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: { input: Record<string, unknown> }) => {
    signed.push(command);
    return `https://bucket.example/${String(command.input.Key)}?X-Amz-Signature=test`;
  }),
}));

const { StorageService, safeFileName } = await import('./storage.service.js');

const FULL_ENV: Record<string, string> = {
  STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  STORAGE_BUCKET: 'neurospark',
  STORAGE_ACCESS_KEY_ID: 'AKIATEST',
  STORAGE_SECRET_ACCESS_KEY: 'secret',
  STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com/',
};

function serviceWith(env: Record<string, string>) {
  const config = {
    get: (key: string, fallback?: string) => env[key] ?? fallback,
    getOrThrow: (key: string) => {
      if (!(key in env)) throw new Error(`missing ${key}`);
      return env[key];
    },
  } as unknown as ConfigService;
  return new StorageService(config);
}

describe('StorageService', () => {
  beforeEach(() => {
    signed.length = 0;
  });

  it('answers 503 when storage is not configured', async () => {
    const storage = serviceWith({});
    expect(storage.isConfigured()).toBe(false);
    await expect(
      storage.createUpload({ kind: 'image', fileName: 'a.png', contentType: 'image/png', sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('puts images under public/ and returns a public URL without a double slash', async () => {
    const storage = serviceWith(FULL_ENV);
    const upload = await storage.createUpload({
      kind: 'image',
      fileName: 'My Cover.PNG',
      contentType: 'image/png',
      sizeBytes: 2048,
    });
    expect(upload.Key).toMatch(/^public\/\d{4}\/[0-9a-f-]{36}-my-cover\.png$/);
    expect(upload.PublicUrl).toBe(`https://cdn.example.com/${upload.Key}`);
    expect(upload.Method).toBe('PUT');
    expect(upload.Headers).toEqual({ 'Content-Type': 'image/png', 'Content-Length': '2048' });
    expect(signed[0].input).toMatchObject({
      Bucket: 'neurospark',
      Key: upload.Key,
      ContentType: 'image/png',
      ContentLength: 2048,
    });
  });

  it('puts product files under private/ and never returns a public URL', async () => {
    const storage = serviceWith(FULL_ENV);
    const upload = await storage.createUpload({
      kind: 'product-file',
      fileName: 'Starter Guide.pdf',
      contentType: 'application/pdf',
      sizeBytes: 5_000_000,
    });
    expect(upload.Key.startsWith('private/')).toBe(true);
    expect(upload.PublicUrl).toBeUndefined();
  });

  it('lets a product file upload work without a public base URL, but not an image', async () => {
    const { STORAGE_PUBLIC_BASE_URL: _omit, ...env } = FULL_ENV;
    const storage = serviceWith(env);
    await expect(
      storage.createUpload({ kind: 'product-file', fileName: 'a.zip', contentType: 'application/zip', sizeBytes: 5 }),
    ).resolves.toBeDefined();
    await expect(
      storage.createUpload({ kind: 'image', fileName: 'a.png', contentType: 'image/png', sizeBytes: 5 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('refuses types that do not fit the kind (no executables or SVG as images)', async () => {
    const storage = serviceWith(FULL_ENV);
    for (const [kind, contentType] of [
      ['image', 'image/svg+xml'],
      ['image', 'application/pdf'],
      ['product-file', 'text/html'],
      ['product-file', 'application/x-msdownload'],
    ] as const) {
      await expect(
        storage.createUpload({ kind, fileName: 'x', contentType, sizeBytes: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('enforces the size limits', async () => {
    const storage = serviceWith(FULL_ENV);
    await expect(
      storage.createUpload({ kind: 'image', fileName: 'big.png', contentType: 'image/png', sizeBytes: 6 * 1024 * 1024 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createUpload({ kind: 'image', fileName: 'empty.png', contentType: 'image/png', sizeBytes: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createUpload({
        kind: 'product-file',
        fileName: 'huge.zip',
        contentType: 'application/zip',
        sizeBytes: 1001 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('safeFileName', () => {
  it('keeps the extension and strips anything unsafe', () => {
    expect(safeFileName('My Guide (v2).PDF')).toBe('my-guide-v2.pdf');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('..\\..\\secret.pdf')).toBe('secret.pdf');
    expect(safeFileName('Café Ñandú.png')).toBe('cafe-nandu.png');
    expect(safeFileName('????')).toBe('file');
    expect(safeFileName('noext')).toBe('noext');
  });
});
