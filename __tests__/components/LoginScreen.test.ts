// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/LoginScreen.test.ts
// LoginScreen form-validation tests. The component delegates validation,
// error strings, identifier normalisation and submit-disabled state to a
// pure-logic module so the rules can be exercised without spinning up
// React Native.

import {
    areLoginFieldsFilled,
    EMPTY_FORM_ERROR,
    INVALID_USERNAME_ERROR,
    isValidEmail,
    looksLikeEmail,
    meetsPasswordMinLength,
    normalizeIdentifier,
    shouldDisableSubmit,
} from '../../components/screens/LoginScreen.utils';

// ---------------------------------------------------------------------------
// 1. Email format validation
// ---------------------------------------------------------------------------

describe('LoginScreen – email format validation', () => {
    it('accepts a well-formed email address', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('first.last+tag@sub.domain.co')).toBe(true);
    });

    it('rejects strings without an @ sign', () => {
        expect(isValidEmail('plainstring')).toBe(false);
    });

    it('rejects strings with whitespace, missing local part, or missing TLD', () => {
        expect(isValidEmail('user @example.com')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('user@example')).toBe(false);
    });

    it('returns false for non-string or empty input', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('   ')).toBe(false);
        // @ts-expect-error – exercising runtime guard
        expect(isValidEmail(undefined)).toBe(false);
        // @ts-expect-error – exercising runtime guard
        expect(isValidEmail(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 2. Password minimum length
// ---------------------------------------------------------------------------

describe('LoginScreen – password minimum length', () => {
    it('accepts passwords at or above the minimum length', () => {
        expect(meetsPasswordMinLength('123456')).toBe(true);
        expect(meetsPasswordMinLength('abcdefgh')).toBe(true);
    });

    it('rejects passwords shorter than the minimum length', () => {
        expect(meetsPasswordMinLength('12345')).toBe(false);
        expect(meetsPasswordMinLength('')).toBe(false);
    });

    it('honours a custom minimum length when supplied', () => {
        expect(meetsPasswordMinLength('short', 10)).toBe(false);
        expect(meetsPasswordMinLength('long-enough', 10)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 3. Empty-field detection and surfaced error message
// ---------------------------------------------------------------------------

describe('LoginScreen – empty-field detection', () => {
    it('treats the form as invalid when either field is empty', () => {
        expect(areLoginFieldsFilled('', 'password')).toBe(false);
        expect(areLoginFieldsFilled('user', '')).toBe(false);
        expect(areLoginFieldsFilled('', '')).toBe(false);
    });

    it('treats whitespace-only fields as empty', () => {
        expect(areLoginFieldsFilled('   ', 'password')).toBe(false);
        expect(areLoginFieldsFilled('user', '   ')).toBe(false);
    });

    it('treats the form as valid when both fields have non-whitespace content', () => {
        expect(areLoginFieldsFilled('user@example.com', 'secret123')).toBe(true);
        expect(areLoginFieldsFilled('  user  ', '  secret  ')).toBe(true);
    });

    it('exposes a stable empty-form error message', () => {
        expect(EMPTY_FORM_ERROR).toBe('Please enter your username/email and password.');
        expect(INVALID_USERNAME_ERROR).toBe('Invalid username or email.');
    });
});

// ---------------------------------------------------------------------------
// 4. Submit button disabled state
// ---------------------------------------------------------------------------

describe('LoginScreen – submit button disabled state', () => {
    it('disables the submit button while a request is in flight', () => {
        expect(shouldDisableSubmit(true)).toBe(true);
    });

    it('enables the submit button when no request is in flight', () => {
        expect(shouldDisableSubmit(false)).toBe(false);
    });

    it('coerces truthy/falsy non-boolean values defensively', () => {
        expect(shouldDisableSubmit(1 as unknown as boolean)).toBe(true);
        expect(shouldDisableSubmit(0 as unknown as boolean)).toBe(false);
        expect(shouldDisableSubmit(null as unknown as boolean)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 5. Identifier normalisation (case-insensitive usernames)
// ---------------------------------------------------------------------------

describe('LoginScreen – identifier normalisation', () => {
    it('lowercases the identifier so usernames are case-insensitive', () => {
        expect(normalizeIdentifier('AhlanUser')).toBe('ahlanuser');
        expect(normalizeIdentifier('USER@EXAMPLE.COM')).toBe('user@example.com');
    });

    it('returns an empty string for non-string input', () => {
        // @ts-expect-error – exercising runtime guard
        expect(normalizeIdentifier(undefined)).toBe('');
        // @ts-expect-error – exercising runtime guard
        expect(normalizeIdentifier(null)).toBe('');
    });
});

// ---------------------------------------------------------------------------
// 6. Email-vs-username branch selector
// ---------------------------------------------------------------------------

describe('LoginScreen – email vs username branch', () => {
    it('treats inputs containing @ as an email', () => {
        expect(looksLikeEmail('user@example.com')).toBe(true);
        expect(looksLikeEmail('not-an-email@')).toBe(true);
    });

    it('treats inputs without @ as a username', () => {
        expect(looksLikeEmail('ahlanuser')).toBe(false);
        expect(looksLikeEmail('')).toBe(false);
    });
});
