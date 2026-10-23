import { createHash } from 'node:crypto';

// Refresh tokens are long JWTs, so a fast SHA-256 is enough to store them
// safely (bcrypt would only look at the first 72 bytes, which is the header).
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
