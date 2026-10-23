import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators.js';
import { Role, STAFF_ROLES } from '../common/role.enum.js';
import type { AuthRequest } from './auth.types.js';

/** A route with no @Roles() is open to every signed-in staff role; @Roles() narrows it. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const { user } = context.switchToHttp().getRequest<AuthRequest>();
    // No user means the route is @Public(), so there is nothing to check.
    if (!user) return true;

    const declared = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowed = declared?.length ? declared : STAFF_ROLES;
    if (!allowed.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
