import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Static lookup table: the five official Vault categories, seeded on startup. */
@Entity('vault_categories')
export class VaultCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  /** Position in the official order (1 to 5). */
  @Column()
  sortOrder: number;
}
