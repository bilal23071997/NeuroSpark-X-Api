import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PublishStatus } from './publish-status.enum.js';

@Entity('episodes')
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  /**
   * Slug of the podcast series, e.g. "build-with-ai". The list of series is
   * hardcoded on the website, so this just has to match one of those slugs.
   */
  @Column()
  series: string;

  @Column()
  episodeNumber: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Shown as text, e.g. "41 min". */
  @Column({ type: 'varchar', nullable: true })
  duration: string | null;

  /** Episodes live on YouTube; nothing is uploaded or hosted here. */
  @Column({ type: 'varchar', nullable: true })
  youtubeUrl: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  showNotes: string[];

  @Column({ type: 'varchar', default: PublishStatus.Draft })
  status: PublishStatus;

  /** Set the first time the episode is published. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Only one episode is featured at a time. */
  @Column({ default: false })
  isFeatured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
