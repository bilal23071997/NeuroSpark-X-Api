import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/role.enum.js';

/** Static lookup table: one row per role, seeded on startup. */
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // varchar rather than a DB enum so a new role is just a new row, not a schema change.
  @Column({ type: 'varchar', unique: true })
  name: Role;

  @Column()
  description: string;
}
