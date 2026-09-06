import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/password';

describe('password hashing', () => {
  it('verifies a password against its scrypt hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toEqual({
      valid: true,
      needsRehash: false,
    });
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('wrong password', hash)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it('supports one-time migration from a legacy plaintext value', async () => {
    await expect(verifyPassword('legacy-password', 'legacy-password')).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
  });
});
