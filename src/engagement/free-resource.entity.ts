import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** A free download offered as a lead magnet. */
@Entity('free_resources')
export class FreeResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Shown as a label, e.g. "Guide" or "Planner". */
  @Column()
  type: string;

  /** Slug of the ecosystem destination it belongs to. */
  @Column({ type: 'varchar', nullable: true })
  destination: string | null;

  /** Where the free file or page lives. Free items only: paid files never go here. */
  @Column()
  url: string;

  @Column({ default: false })
  isPublished: boolean;

  /** Lower numbers show first. */
  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
