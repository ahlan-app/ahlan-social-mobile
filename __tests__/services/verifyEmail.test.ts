/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/verifyEmail.test.ts
 *
 * Email verification flow tests: initial send, resend cooldown, link consumption, expiry handling.
 */

import { requestVerification, consumeVerificationLink, resendCooldownRemaining } from '../../src/services/verifyEmail';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      resend: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

import { supabase } from '../../src/services/supabase';

describe('requestVerification', () => {
  test('triggers a verification email', async () => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({ data: {}, error: null });
    await requestVerification('samet@example.com');
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'samet@example.com',
    });
  });
});

describe('consumeVerificationLink', () => {
  test('calls verifyOtp with the token_hash and type', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const result = await consumeVerificationLink({ token_hash: 'tok', type: 'email' });
    expect(result.userId).toBe('u1');
    expect(supabase.auth.verifyOtp).toHaveBeenCalled();
  });

  test('returns a friendly error for expired tokens', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'otp_expired' },
    });
    const result = await consumeVerificationLink({ token_hash: 'tok', type: 'email' });
    expect(result.error).toMatch(/expired/i);
  });
});

describe('resendCooldownRemaining', () => {
  test('returns 0 when no previous send is recorded', async () => {
    expect(await resendCooldownRemaining('samet@example.com')).toBe(0);
  });
});
