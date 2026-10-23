import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Niche } from './niche.entity.js';
import { PublishStatus } from './publish-status.enum.js';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  excerpt: string;

  /** Paragraphs, in order — the same shape the website renders today. */
  @Column({ type: 'jsonb' })
  body: string[];

  @ManyToOne(() => Niche, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nicheId' })
  niche: Niche;

  @Column()
  nicheId: string;

  @Column({ type: 'varchar', default: PublishStatus.Draft })
  status: PublishStatus;

  /** Set the first time the article is published. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Only one article is featured at a time. */
  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ type: 'varchar', nullable: true })
  seoDescription: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
