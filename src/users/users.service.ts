import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RolesService } from '../roles/roles.service.js';
import type { Role } from '../common/role.enum.js';
import { UpdateUserDto } from './dto.js';
import { User } from './user.entity.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly roles: RolesService,
  ) {}

  findAll(role?: Role) {
    return this.users.find({
      where: role ? { role: { name: role } } : {},
      order: { createdAt: 'ASC' },
    });
  }

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  /** Includes the password hash — only for login. */
  findForLogin(email: string) {
    return this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  /** Includes the password hash — only for password change. */
  findByIdWithPassword(id: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  /** Includes the refresh token hash — only for token refresh. */
  findForRefresh(id: string) {
    return this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  count() {
    return this.users.count();
  }

  async create(dto: { email: string; name: string; password: string; role: Role }) {
    const email = dto.email.toLowerCase();
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('A user with this email already exists');
    }
    const user = this.users.create({
      email,
      name: dto.name,
      role: await this.roles.findByName(dto.role),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
    });
    const saved = await this.users.save(user);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = await this.roles.findByName(dto.role);
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    // A deactivated user or a password change must end existing sessions.
    if (dto.isActive === false || dto.password !== undefined) {
      user.refreshTokenHash = null;
    }
    await this.users.save(user);
    return this.findById(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.findByIdWithPassword(id);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    // Ends every existing session; the user signs in again with the new password.
    await this.users.update(id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
      refreshTokenHash: null,
    });
  }

  setRefreshTokenHash(id: string, hash: string | null) {
    return this.users.update(id, { refreshTokenHash: hash });
  }
}
