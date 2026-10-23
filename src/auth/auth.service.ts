import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { sha256 } from '../common/hash.js';
import { UsersService } from '../users/users.service.js';
import type { User } from '../users/user.entity.js';
import type { JwtPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findForLogin(email);
    // Same message for unknown email, wrong password and disabled account.
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findForRefresh(payload.sub);
    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      user.refreshTokenHash !== sha256(refreshToken)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotation: the old refresh token stops working once a new one is issued.
    return this.issueTokens(user);
  }

  logout(userId: string) {
    return this.users.setRefreshTokenHash(userId, null);
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, jti: randomUUID() };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL', '7d'),
      }),
    ]);
    await this.users.setRefreshTokenHash(user.id, sha256(refreshToken));
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role.name },
    };
  }
}
