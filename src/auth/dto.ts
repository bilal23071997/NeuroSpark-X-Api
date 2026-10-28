import { IsEmail, IsString, MinLength } from 'class-validator';
import { Role } from '../common/role.enum.js';

export class LoginDto {
  /** @example admin@neurosparkx.com */
  @IsEmail()
  email: string;

  /** @example my-password */
  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshDto {
  /** The refresh token returned by login or a previous refresh. */
  @IsString()
  @MinLength(1)
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  /** At least 10 characters. */
  @IsString()
  @MinLength(10)
  newPassword: string;
}

export class SessionUserDto {
  Id: string;
  Email: string;
  Name: string;
  Role: Role;
}

export class TokensDto {
  /** Short-lived (15 min). Send as `Authorization: Bearer <accessToken>`. */
  AccessToken: string;
  /** Long-lived (7 days). Single use: each refresh returns a new one. */
  RefreshToken: string;
  User: SessionUserDto;
}
