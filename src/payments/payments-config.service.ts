import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  KeySetDto,
  PaymentSettingsDto,
  UpdatePaymentSettingsDto,
} from './payments.dto.js';
import { PaymentConfig, PaymentMode } from './payment-config.entity.js';
import { decryptSecret, encryptSecret, maskSecret } from './secret-box.js';

export interface ActiveKeys {
  mode: PaymentMode;
  secretKey: string;
  webhookSecret: string | null;
  publishableKey: string | null;
}

const PUBLISHABLE_PATTERN: Record<PaymentMode, RegExp> = {
  test: /^pk_test_[A-Za-z0-9]+$/,
  live: /^pk_live_[A-Za-z0-9]+$/,
};

const KEY_PATTERN: Record<PaymentMode, RegExp> = {
  test: /^(?:sk|rk)_test_[A-Za-z0-9]+$/,
  live: /^(?:sk|rk)_live_[A-Za-z0-9]+$/,
};

/** Stripe keys: from STRIPE_* environment variables if set, otherwise from the admin screen. */
@Injectable()
export class PaymentsConfigService {
  constructor(
    @InjectRepository(PaymentConfig)
    private readonly configs: Repository<PaymentConfig>,
    private readonly config: ConfigService,
  ) {}

  /** The keys checkout should use right now, or null when payments are not set up. */
  async active(): Promise<ActiveKeys | null> {
    const envKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (envKey) {
      return {
        mode: envKey.includes('_live_') ? 'live' : 'test',
        secretKey: envKey,
        webhookSecret: this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? null,
        publishableKey:
          this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? null,
      };
    }
    if (!this.canDecrypt()) return null;
    const row = await this.row();
    const secret =
      row.mode === 'live' ? row.liveSecretKeyEnc : row.testSecretKeyEnc;
    if (!secret) return null;
    const webhook =
      row.mode === 'live' ? row.liveWebhookSecretEnc : row.testWebhookSecretEnc;
    return {
      mode: row.mode,
      secretKey: decryptSecret(secret, this.passphrase()),
      webhookSecret: webhook ? decryptSecret(webhook, this.passphrase()) : null,
      publishableKey: this.readPublishable(
        row.mode === 'live' ? row.livePublishableKey : row.testPublishableKey,
      ),
    };
  }

  async requireActive() {
    const keys = await this.active();
    if (!keys)
      throw new ServiceUnavailableException('Payments are not set up yet');
    return keys;
  }

  /** A Stripe client for the active keys. Built per call because the owner can change them at any time. */
  async stripe() {
    const keys = await this.requireActive();
    return { stripe: new Stripe(keys.secretKey), keys };
  }

  /** Checkout needs the secret key, the webhook secret (it marks orders paid) and the publishable key (it shows the form). */
  async isEnabled() {
    const keys = await this.active();
    return Boolean(keys?.webhookSecret && keys.publishableKey);
  }

  async getForAdmin(webhookUrl: string): Promise<PaymentSettingsDto> {
    const row = await this.row();
    const canStoreKeys = this.canDecrypt();
    const status = (mode: PaymentMode) => {
      const secret =
        mode === 'live' ? row.liveSecretKeyEnc : row.testSecretKeyEnc;
      const webhook =
        mode === 'live' ? row.liveWebhookSecretEnc : row.testWebhookSecretEnc;
      return {
        SecretKey:
          secret && canStoreKeys
            ? maskSecret(decryptSecret(secret, this.passphrase()))
            : null,
        WebhookSecretSet: Boolean(webhook),
        PublishableKey: (() => {
          const key = canStoreKeys
            ? this.readPublishable(
                mode === 'live'
                  ? row.livePublishableKey
                  : row.testPublishableKey,
              )
            : null;
          return key ? maskSecret(key) : null;
        })(),
      };
    };
    const active = await this.active();
    return {
      Mode: active?.mode ?? row.mode,
      Test: status('test'),
      Live: status('live'),
      Enabled: Boolean(active?.webhookSecret && active.publishableKey),
      WebhookUrl: webhookUrl,
      FromEnvironment: Boolean(this.config.get('STRIPE_SECRET_KEY')),
      CanStoreKeys: canStoreKeys,
    };
  }

  async update(dto: UpdatePaymentSettingsDto) {
    if (this.config.get('STRIPE_SECRET_KEY')) {
      throw new BadRequestException(
        'Stripe is configured through server environment variables, so it cannot be changed here',
      );
    }
    const row = await this.row();
    this.applyKeys(row, 'test', dto.test);
    this.applyKeys(row, 'live', dto.live);
    if (dto.mode) {
      if (
        dto.mode === 'live' &&
        !(
          row.liveSecretKeyEnc &&
          row.liveWebhookSecretEnc &&
          row.livePublishableKey
        )
      ) {
        throw new BadRequestException(
          'Save the live secret key, publishable key and webhook secret before switching to live',
        );
      }
      row.mode = dto.mode;
    }
    await this.configs.save(row);
  }

  /** Removes the saved keys of one mode. Falls back to test when the live keys are removed while live is on. */
  async clear(mode: PaymentMode) {
    if (this.config.get('STRIPE_SECRET_KEY')) {
      throw new BadRequestException(
        'Stripe is configured through server environment variables',
      );
    }
    const row = await this.row();
    row[mode === 'live' ? 'liveSecretKeyEnc' : 'testSecretKeyEnc'] = null;
    row[mode === 'live' ? 'liveWebhookSecretEnc' : 'testWebhookSecretEnc'] =
      null;
    row[mode === 'live' ? 'livePublishableKey' : 'testPublishableKey'] = null;
    if (mode === 'live' && row.mode === 'live') row.mode = 'test';
    await this.configs.save(row);
  }

  private applyKeys(row: PaymentConfig, mode: PaymentMode, keys?: KeySetDto) {
    if (!keys) return;
    if (keys.secretKey) {
      if (!KEY_PATTERN[mode].test(keys.secretKey)) {
        throw new BadRequestException(
          `The ${mode} secret key must start with sk_${mode}_ (or rk_${mode}_ for a restricted key)`,
        );
      }
      row[mode === 'live' ? 'liveSecretKeyEnc' : 'testSecretKeyEnc'] =
        encryptSecret(keys.secretKey, this.passphrase());
    }
    if (keys.publishableKey) {
      if (!PUBLISHABLE_PATTERN[mode].test(keys.publishableKey)) {
        throw new BadRequestException(
          `The ${mode} publishable key must start with pk_${mode}_`,
        );
      }
      row[mode === 'live' ? 'livePublishableKey' : 'testPublishableKey'] =
        encryptSecret(keys.publishableKey, this.passphrase());
    }
    if (keys.webhookSecret) {
      row[mode === 'live' ? 'liveWebhookSecretEnc' : 'testWebhookSecretEnc'] =
        encryptSecret(keys.webhookSecret, this.passphrase());
    }
  }

  private async row() {
    return (
      (await this.configs.findOneBy({ id: 1 })) ??
      this.configs.create({
        id: 1,
        mode: 'test',
        testSecretKeyEnc: null,
        testWebhookSecretEnc: null,
        testPublishableKey: null,
        livePublishableKey: null,
        liveSecretKeyEnc: null,
        liveWebhookSecretEnc: null,
      })
    );
  }

  /** Publishable keys are encrypted like the others; one saved before that (plain pk_…) still reads fine and is encrypted on its next save. */
  private readPublishable(stored: string | null) {
    if (!stored) return null;
    return stored.startsWith('pk_')
      ? stored
      : decryptSecret(stored, this.passphrase());
  }

  private canDecrypt() {
    return Boolean(this.config.get('PAYMENTS_ENCRYPTION_KEY'));
  }

  private passphrase() {
    const value = this.config.get<string>('PAYMENTS_ENCRYPTION_KEY');
    if (!value) {
      throw new ServiceUnavailableException(
        'Set PAYMENTS_ENCRYPTION_KEY on the server before saving payment keys here',
      );
    }
    return value;
  }
}
