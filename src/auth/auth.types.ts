import type { Request } from 'express';
import type { Role } from '../common/role.enum.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  jti?: string;
}

export type AuthRequest = Request & { user: AuthUser };
