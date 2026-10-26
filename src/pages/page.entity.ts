import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublishStatus } from '../content/publish-status.enum.js';

/**
 * A standalone site page such as /privacy or /terms. There are no seeded rows:
 * the client supplies the text, nothing is made up here.
 */
@Entity('pages')
export class SitePage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The page address, e.g. "privacy" for /privacy. */
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  /**
   * Plain text. Paragraphs are separated by a blank line, and a paragraph that
   * starts with "## " is a heading. The website draws it with the site theme.
   */
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: PublishStatus.Draft })
  status: PublishStatus;

  /** Set the first time the page is published. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
