import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export type UploadKind = 'image' | 'product-file';

interface KindRules {
  /** Object key prefix. `public/` is served from the public base URL; `private/` is never public. */
  prefix: string;
  contentTypes: string[];
  maxBytes: number;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadKind, KindRules> = {
  image: {
    prefix: 'public/',
    contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    maxBytes: 5 * MB,
  },
  'product-file': {
    prefix: 'private/',
    contentTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/epub+zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/x-wav',
      'video/mp4',
    ],
    maxBytes: 1000 * MB,
  },
};

const PRESIGN_SECONDS = 15 * 60;

export interface PresignedUpload {
  /** PUT the file bytes to this URL. */
  uploadUrl: string;
  method: 'PUT';
  /** Send exactly these headers with the PUT (Content-Type and Content-Length are signed). */
  headers: Record<string, string>;
  /** Save this on the product (`fileKey`) or keep it to delete the object later. */
  key: string;
  /** Present for images only: the public URL to store on the product. */
  publicUrl?: string;
  expiresInSeconds: number;
}

/** Turns an upload name into a safe object-key tail: lowercase letters, numbers, dots, hyphens. */
export function safeFileName(fullName: string) {
  // Only the last path segment counts, so "../../x.pdf" cannot climb out of the folder.
  const name = fullName.split(/[\\/]/).pop() ?? '';
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : '';
  const clean = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const safeBase = clean(base).slice(0, 60) || 'file';
  const safeExt = clean(ext).slice(0, 10);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

/**
 * S3-compatible object storage (Cloudflare R2 or AWS S3). Browsers upload
 * straight to the bucket with a presigned PUT, so file bytes never pass
 * through this API. If the STORAGE_* variables are missing the API still boots
 * and the upload endpoint answers 503.
 */
@Injectable()
export class StorageService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get('STORAGE_ENDPOINT') &&
        this.config.get('STORAGE_BUCKET') &&
        this.config.get('STORAGE_ACCESS_KEY_ID') &&
        this.config.get('STORAGE_SECRET_ACCESS_KEY'),
    );
  }

  async createUpload(input: {
    kind: UploadKind;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<PresignedUpload> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'File storage is not configured. Set the STORAGE_* environment variables.',
      );
    }
    const publicBase = this.publicBaseUrl();
    if (input.kind === 'image' && !publicBase) {
      throw new ServiceUnavailableException(
        'Image uploads need STORAGE_PUBLIC_BASE_URL (the public address of the bucket).',
      );
    }

    const rules = UPLOAD_RULES[input.kind];
    if (!rules.contentTypes.includes(input.contentType)) {
      throw new BadRequestException(
        `A ${input.kind} cannot be ${input.contentType}. Allowed: ${rules.contentTypes.join(', ')}`,
      );
    }
    if (input.sizeBytes < 1 || input.sizeBytes > rules.maxBytes) {
      throw new BadRequestException(
        `A ${input.kind} must be between 1 byte and ${Math.floor(rules.maxBytes / MB)} MB`,
      );
    }

    const year = new Date().getUTCFullYear();
    const key = `${rules.prefix}${year}/${randomUUID()}-${safeFileName(input.fileName)}`;
    const uploadUrl = await getSignedUrl(
      this.getClient(),
      new PutObjectCommand({
        Bucket: this.config.getOrThrow<string>('STORAGE_BUCKET'),
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.sizeBytes,
      }),
      { expiresIn: PRESIGN_SECONDS },
    );

    return {
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType,
        'Content-Length': String(input.sizeBytes),
      },
      key,
      ...(input.kind === 'image' ? { publicUrl: `${publicBase}/${key}` } : {}),
      expiresInSeconds: PRESIGN_SECONDS,
    };
  }

  private publicBaseUrl() {
    return this.config.get<string>('STORAGE_PUBLIC_BASE_URL')?.replace(/\/+$/, '');
  }

  private getClient() {
    this.client ??= new S3Client({
      region: this.config.get<string>('STORAGE_REGION', 'auto'),
      endpoint: this.config.getOrThrow<string>('STORAGE_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('STORAGE_SECRET_ACCESS_KEY'),
      },
      // R2 and most S3-compatible stores want the bucket in the path, not the hostname.
      forcePathStyle: true,
    });
    return this.client;
  }
}
