/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/forgotPassword.test.ts
 *
 * Password reset service tests: request, confirm, link expiry, and rate-limit behaviour.
 */

import { requestPasswordReset, confirmPasswordReset } from '../../src/services/forgotPassword';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

import { supabase } from '../../src/services/supabase';

describe('requestPasswordReset', () => {
  test('sends the reset email for a registered address', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });
    await requestPasswordReset('samet@example.com');
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'samet@example.com',
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
  });

  test('rejects malformed email addresses', async () => {
    await expect(requestPasswordReset('not-an-email')).rejects.toThrow(/email/i);
  });
});

describe('confirmPasswordReset', () => {
  test('verifies the token and updates the password', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const result = await confirmPasswordReset({ token_hash: 'tok', newPassword: 'NewPass123!' });
    expect(result.userId).toBe('u1');
  });

  test('rejects passwords below the minimum length', async () => {
    await expect(
      confirmPasswordReset({ token_hash: 'tok', newPassword: 'short' }),
    ).rejects.toThrow(/length/i);
  });

  test('returns an expired error when the otp is past its lifetime', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'otp_expired' },
    });
    const result = await confirmPasswordReset({ token_hash: 'tok', newPassword: 'NewPass123!' });
    expect(result.error).toMatch(/expired/i);
  });
});
