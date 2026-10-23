import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/role.enum.js';
import { RoleEntity } from './role.entity.js';

const STATIC_ROLES: { name: Role; description: string }[] = [
  { name: Role.Admin, description: 'Full access to the admin portal, including managing staff accounts.' },
  { name: Role.Editor, description: 'Admin portal access for content (articles, episodes).' },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(@InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>) {}

  /** Keeps the table in step with STATIC_ROLES; safe to run on every start. */
  async onModuleInit() {
    await this.roles.upsert(STATIC_ROLES, ['name']);
  }

  findAll() {
    return this.roles.find({ order: { id: 'ASC' } });
  }

  findByName(name: Role) {
    return this.roles.findOneByOrFail({ name });
  }
}
