import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';

/**
 * Rate limits count requests per visitor. The website's Server Actions call
 * this API from the website's own server, so every visitor would share one
 * address. The website therefore sends the visitor's address in `X-Client-IP`
 * together with the shared `X-Internal-Key`; the address is trusted only when
 * the key matches INTERNAL_API_KEY. Anything else is counted by the real
 * connection address, so a made-up header cannot dodge a limit.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const key = process.env.INTERNAL_API_KEY;
    const given = req.headers?.['x-internal-key'];
    const ip = req.headers?.['x-client-ip'];
    if (
      key &&
      typeof given === 'string' &&
      typeof ip === 'string' &&
      ip.length > 0 &&
      ip.length <= 64 &&
      given.length === key.length &&
      timingSafeEqual(Buffer.from(given), Buffer.from(key))
    ) {
      return ip;
    }
    return super.getTracker(req);
  }
}
