import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../common/role.enum.js';
import { UsersService } from './users.service.js';

/** Creates the first admin from env vars when the users table is empty. */
@Injectable()
export class SeedAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedAdminService.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.users.count()) > 0) return;

    const email = this.config.get<string>('SEED_ADMIN_EMAIL');
    const password = this.config.get<string>('SEED_ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('No users exist and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.');
      return;
    }
    await this.users.create({ email, password, name: 'Admin', role: Role.Admin });
    this.logger.log(`Created first admin account: ${email}`);
  }
}
