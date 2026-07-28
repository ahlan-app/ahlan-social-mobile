/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/biometric.test.ts
 *
 * Biometric prompt service tests: prompt, success, fallback to PIN, lockout, hardware-unavailable paths.
 */

import { authenticate, BiometricKind } from '../../src/services/biometric';

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: {
    isSensorAvailable: jest.fn(),
    simplePrompt: jest.fn(),
  },
}));

import ReactNativeBiometrics from 'react-native-biometrics';

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns success when the user authenticates with FaceID', async () => {
    (ReactNativeBiometrics.isSensorAvailable as jest.Mock).mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });
    (ReactNativeBiometrics.simplePrompt as jest.Mock).mockResolvedValue({ success: true });

    const result = await authenticate({ promptMessage: 'Open Ahlan' });
    expect(result).toEqual({ ok: true, kind: BiometricKind.FaceID });
  });

  test('falls back to PIN when biometrics are unavailable', async () => {
    (ReactNativeBiometrics.isSensorAvailable as jest.Mock).mockResolvedValue({
      available: false,
    });
    const result = await authenticate({ promptMessage: 'Open Ahlan', allowPin: true });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('pin_fallback');
  });

  test('reports lockout after too many failed attempts', async () => {
    (ReactNativeBiometrics.isSensorAvailable as jest.Mock).mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    });
    (ReactNativeBiometrics.simplePrompt as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Lockout',
    });
    const result = await authenticate({ promptMessage: 'Open Ahlan' });
    expect(result.reason).toBe('lockout');
  });

  test('surfaces hardware-unavailable errors cleanly', async () => {
    (ReactNativeBiometrics.isSensorAvailable as jest.Mock).mockRejectedValue(
      new Error('no hardware'),
    );
    const result = await authenticate({ promptMessage: 'Open Ahlan' });
    expect(result.ok).toBe(false);
  });

  test('rejects the empty prompt message', async () => {
    await expect(authenticate({ promptMessage: '' })).rejects.toThrow(
      /promptMessage is required/,
    );
  });
});
