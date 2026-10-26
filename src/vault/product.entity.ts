import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublishStatus } from '../content/publish-status.enum.js';
import type { ProductSection } from './sections.js';
import { VaultCategory } from './vault-category.entity.js';

/** A digital product in The Vault. Catalog only: there is no cart, checkout or order yet. */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  description: string;

  /** Regular price in US cents (1900 = $19.00). 0 means free. */
  @Column()
  priceCents: number;

  /** Sale price in US cents, lower than priceCents; null when not on sale. */
  @Column({ type: 'int', nullable: true })
  salePriceCents: number | null;

  /** Shown on cards, e.g. "Digital Guide" or "Audio Series". */
  @Column()
  format: string;

  /** How the buyer receives it, e.g. "Instant download (PDF)". */
  @Column({ type: 'text' })
  delivery: string;

  /** Slug of the ecosystem destination this product supports. */
  @Column({ type: 'varchar', nullable: true })
  destination: string | null;

  /** Who the product is for. */
  @Column({ type: 'text', default: '' })
  forWho: string;

  /** What the buyer gets. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  included: string[];

  /** Symbol art for the cover. */
  @Column({ type: 'varchar', nullable: true })
  symbol: string | null;

  /** Public https URL of the cover image (uploaded as kind `image`). */
  @Column({ type: 'varchar', nullable: true })
  coverImageUrl: string | null;

  /** Public https image URLs, in display order. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  galleryImages: string[];

  /** The page blocks below the summary, in display order. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  sections: ProductSection[];

  /**
   * Object key of the paid file in the PRIVATE part of the bucket. Admin-only:
   * it is never returned by any public endpoint, and nothing serves the file
   * until checkout exists.
   */
  @Column({ type: 'varchar', nullable: true })
  fileKey: string | null;

  /** Original name of the paid file, e.g. "starter-guide.pdf". */
  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  @Column({ type: 'int', nullable: true })
  fileSizeBytes: number | null;

  /** The group the product sits in: one of the five official categories or a sub-group. */
  @ManyToOne(() => VaultCategory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: VaultCategory;

  @Column()
  categoryId: number;

  @Column({ type: 'varchar', default: PublishStatus.Draft })
  status: PublishStatus;

  /** Set the first time the product is published. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ default: false })
  isFeatured: boolean;

  /** "Popular choices" / best seller. */
  @Column({ default: false })
  isPopular: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
