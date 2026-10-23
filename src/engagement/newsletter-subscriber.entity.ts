import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A newsletter sign-up. Stored only: no email is sent from here yet. */
@Entity('newsletter_subscribers')
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Always stored lower-case. */
  @Column({ unique: true })
  email: string;

  /** Where they signed up, e.g. "footer" or "homepage". */
  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ default: true })
  isSubscribed: boolean;

  @CreateDateColumn()
  subscribedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unsubscribedAt: Date | null;
}
