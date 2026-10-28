import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { OrderItem } from './order.entity.js';
import type { PaymentMode } from './payment-config.entity.js';

export class KeySetDto {
  /** Secret (or restricted) key from the Stripe dashboard: `sk_test_…` / `rk_test_…` for test, `sk_live_…` / `rk_live_…` for live. Leave out to keep the saved one. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  secretKey?: string;

  /** Signing secret of the webhook endpoint, starts with `whsec_`. Leave out to keep the saved one. */
  @IsOptional()
  @IsString()
  @Matches(/^whsec_[A-Za-z0-9]+$/, { message: 'The webhook secret must start with whsec_' })
  @MaxLength(300)
  webhookSecret?: string;

  /** Publishable key (`pk_test_…` / `pk_live_…`). It is public: the website uses it to show Stripe's payment form. */
  @IsOptional()
  @IsString()
  @Matches(/^pk_(?:test|live)_[A-Za-z0-9]+$/, { message: 'The publishable key must start with pk_test_ or pk_live_' })
  @MaxLength(300)
  publishableKey?: string;
}

export class UpdatePaymentSettingsDto {
  /** Which key set checkout uses. `live` needs the live key and webhook secret saved first. */
  @IsOptional()
  @IsIn(['test', 'live'])
  mode?: PaymentMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => KeySetDto)
  test?: KeySetDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => KeySetDto)
  live?: KeySetDto;
}

export class KeySetStatusDto {
  /** Masked, e.g. `sk_test_••••4f2a`; null when none is saved. */
  SecretKey: string | null;
  WebhookSecretSet: boolean;
  /** Masked like the secret key, e.g. `pk_test_••••4f2a`; null when none is saved. */
  PublishableKey: string | null;
}

export class PaymentSettingsDto {
  Mode: PaymentMode;
  Test: KeySetStatusDto;
  Live: KeySetStatusDto;
  /** True when checkout can run in the current mode (secret key and webhook secret both saved). */
  Enabled: boolean;
  /** Paste this in Stripe (Developers > Webhooks) and subscribe to `checkout.session.completed` and `checkout.session.expired`. */
  WebhookUrl: string;
  /** True when the keys come from server environment variables (STRIPE_*) and this screen cannot change them. */
  FromEnvironment: boolean;
  /** False when PAYMENTS_ENCRYPTION_KEY is missing, so keys cannot be saved here. */
  CanStoreKeys: boolean;
}

export class PaymentTestResultDto {
  Ok: boolean;
  Mode: PaymentMode;
  Message: string;
}

export class CheckoutItemDto {
  /** Slug of a published product. */
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(200)
  slug: string;
}

export class CreateCheckoutDto {
  /** One or more products; each is sold once per order (digital goods have no quantity). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}

export class CheckoutSessionDto {
  /** Opens Stripe's payment form inside the website (embedded checkout). */
  ClientSecret: string;
  /** Publishable key the website needs to load that form. */
  PublishableKey: string;
}

/** A short-lived link to one purchased file. */
export class DownloadLinkDto {
  /** Valid for 10 minutes. */
  Url: string;
}

/** What the webhook answers Stripe with. */
export class WebhookAckDto {
  Received: boolean;
}

export class PaymentStatusDto {
  /** False until the owner has saved working keys; the website then keeps "Add to Cart" off. */
  Enabled: boolean;
}

export class OrderItemDto {
  Id: string;
  Name: string;
  UnitPriceCents: number;
  /** True when the file can still be downloaded (the product still exists and has a file). */
  Downloadable: boolean;

  static from(item: OrderItem, downloadable: boolean): OrderItemDto {
    return Object.assign(new OrderItemDto(), {
      Id: item.id,
      Name: item.name,
      UnitPriceCents: item.unitPriceCents,
      Downloadable: downloadable,
    });
  }
}

export class PublicOrderDto {
  Number: string;
  Status: 'pending' | 'paid' | 'expired' | 'refunded';
  Email: string | null;
  TotalCents: number;
  Currency: string;
  Items: OrderItemDto[];
}

export class AdminOrderDto extends PublicOrderDto {
  Id: string;
  Mode: PaymentMode;
  StripeSessionId: string | null;
  StripePaymentIntentId: string | null;
  CreatedAt: Date;
  PaidAt: Date | null;
}
