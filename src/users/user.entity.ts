import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { RoleEntity } from '../roles/role.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @ApiHideProperty()
  @Column({ select: false })
  passwordHash: string;

  /** Foreign key to the static roles table (column: roleId). */
  @ManyToOne(() => RoleEntity, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @Column({ default: true })
  isActive: boolean;

  /** bcrypt hash of the current refresh token; null when signed out. */
  @ApiHideProperty()
  @Column({ type: 'varchar', nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
