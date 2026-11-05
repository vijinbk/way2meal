import { type Role } from '@prisma/client';
import { TokenService } from '../../src/modules/auth/token.service';
import type { TestApp } from './test-app';

let counter = 0;

/** Creates a user with the given role and returns an Authorization header for them. */
export async function userWithRole(t: TestApp, role: Role): Promise<{ id: string; auth: string }> {
  counter += 1;
  const user = await t.prisma.user.create({
    data: {
      phone: `+9190000${String(counter).padStart(5, '0')}`,
      role,
      name: `${role} ${counter}`,
    },
  });
  const tokens = await t.app.get(TokenService).issue(user);
  return { id: user.id, auth: `Bearer ${tokens.accessToken}` };
}
