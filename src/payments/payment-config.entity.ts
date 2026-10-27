import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type PaymentMode = 'test' | 'live';

/**
 * The one row (id = 1) holding the Stripe setup the client enters in the admin
 * portal. Secrets are stored encrypted (see secret-box.ts) and never returned.
 * The publishable keys (pk_…) are public by design, so they are stored as plain text.
 */
@Entity('payment_config')
export class PaymentConfig {
  @PrimaryColumn()
  id: number;

  /** Which key set checkout uses. */
  @Column({ type: 'varchar', default: 'test' })
  mode: PaymentMode;

  @Column({ type: 'text', nullable: true })
  testSecretKeyEnc: string | null;

  @Column({ type: 'text', nullable: true })
  testWebhookSecretEnc: string | null;

  @Column({ type: 'text', nullable: true })
  testPublishableKey: string | null;

  @Column({ type: 'text', nullable: true })
  livePublishableKey: string | null;

  @Column({ type: 'text', nullable: true })
  liveSecretKeyEnc: string | null;

  @Column({ type: 'text', nullable: true })
  liveWebhookSecretEnc: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
