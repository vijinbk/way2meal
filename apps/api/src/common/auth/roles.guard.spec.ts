import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const ctx = (path: string, role?: Role) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ path, user: role ? { id: 'u1', role } : undefined }),
    }),
  }) as unknown as ExecutionContext;

const guardWith = (roles: Role[] | undefined) => {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
};

describe('RolesGuard', () => {
  it('allows any authenticated user on routes without @Roles', () => {
    expect(guardWith(undefined).canActivate(ctx('/v1/me', Role.CUSTOMER))).toBe(true);
  });

  it('fails closed on /admin routes that forgot @Roles', () => {
    expect(() => guardWith(undefined).canActivate(ctx('/v1/admin/plans', Role.ADMIN))).toThrow(
      ForbiddenException,
    );
  });

  it('enforces the listed roles', () => {
    const guard = guardWith([Role.ADMIN, Role.KITCHEN]);
    expect(guard.canActivate(ctx('/v1/admin/prep-sheet', Role.KITCHEN))).toBe(true);
    expect(() => guard.canActivate(ctx('/v1/admin/prep-sheet', Role.CUSTOMER))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(ctx('/v1/admin/prep-sheet'))).toThrow(ForbiddenException);
  });
});
