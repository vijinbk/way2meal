/**
 * Prints the ADMIN_STATIC_OTP_HASH value for an admin login code.
 *
 *   pnpm --filter @way2meal/api admin:login-code
 *
 * The code is read from a prompt (or piped stdin), never from argv, so it
 * doesn't land in shell history. Only the hash is printed.
 */
import { createInterface } from 'node:readline/promises';
import { STATIC_CODE_PATTERN, hashStaticCode } from '../src/modules/auth/otp/otp-code';

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const code = (await rl.question('Admin login code (8–12 digits): ')).trim();
  rl.close();
  if (!STATIC_CODE_PATTERN.test(code)) {
    console.error('The code must be 8–12 digits. 10 random digits is a good choice.');
    process.exitCode = 1;
    return;
  }
  console.error('\nSet this on the API server (keep the code itself somewhere safe):\n');
  process.stdout.write(`ADMIN_STATIC_OTP_HASH=${hashStaticCode(code)}\n`);
}

void main();
