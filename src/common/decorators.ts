import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum.js';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skips the global JWT guard for this route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the listed roles. Routes without it accept any signed-in user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
