import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A Vault group. The five official categories are seeded on startup as fixed
 * top-level groups (`isOfficial`, no parent); admins add sub-groups under them,
 * one level deep.
 */
@Entity('vault_categories')
export class VaultCategory {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unique across every group, so a slug always means exactly one group. */
  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  /** Order among its siblings (the five official ones are 1 to 5). */
  @Column()
  sortOrder: number;

  /** True for the five official categories: they can never be deleted, renamed or moved. */
  @Column({ default: false })
  isOfficial: boolean;

  /** Null for a top-level group; otherwise the id of the official category it sits under. */
  @ManyToOne(() => VaultCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentId' })
  parent: VaultCategory | null;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;
}
