import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthedRequest, ROLES_KEY } from './decorators';

/**
 * Runs after JwtAuthGuard. Routes without @Roles() are open to any authenticated
 * user — except /admin routes, which fail closed if a handler forgets @Roles().
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!roles || roles.length === 0) {
      if (/^\/v\d+\/admin(\/|$)/.test(req.path)) {
        throw new ForbiddenException('Admin route is missing a role requirement');
      }
      return true;
    }

    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return true;
  }
}
