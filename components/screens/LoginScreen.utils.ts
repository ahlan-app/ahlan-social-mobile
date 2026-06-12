// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure validation and form-state helpers extracted from LoginScreen.tsx so
// they can be tested without rendering React Native components.

/**
 * RFC-5322-lite email pattern. Accepts the common `local@domain.tld` shape
 * without trying to be a full RFC 5322 implementation (which is impractical
 * in a single regex).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns true when the supplied identifier looks like a valid email
 * address. Accepts the same input the LoginScreen renders into the
 * "Username or Email" field.
 */
export const isValidEmail = (value: string): boolean => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed === '') return false;
    return EMAIL_RE.test(trimmed);
};

/**
 * Returns true when the password meets the minimum-length rule. The current
 * rule is 6+ characters, matching Supabase's default auth requirement.
 */
export const meetsPasswordMinLength = (
    password: string,
    minLength: number = 6,
): boolean => {
    if (typeof password !== 'string') return false;
    return password.length >= minLength;
};

/**
 * Returns true when both fields are non-empty (after trimming). Mirrors the
 * `isFormValid` flag computed inside LoginScreen.
 */
export const areLoginFieldsFilled = (
    identifier: string,
    password: string,
): boolean => {
    return (
        typeof identifier === 'string' &&
        typeof password === 'string' &&
        identifier.trim() !== '' &&
        password.trim() !== ''
    );
};

/**
 * The error message displayed when the user attempts to submit an empty
 * form. Centralised so tests and the component stay in sync.
 */
export const EMPTY_FORM_ERROR =
    'Please enter your username/email and password.';

/**
 * The error message raised when a username lookup fails (either the RPC
 * returned an error or the username did not resolve to an email).
 */
export const INVALID_USERNAME_ERROR = 'Invalid username or email.';

/**
 * Generic fallback error displayed when authentication fails for any other
 * reason.
 */
export const GENERIC_AUTH_ERROR = 'Invalid credentials. Please try again.';

/**
 * Returns true when the submit button should be disabled. The LoginScreen
 * always disables the button while a request is in flight; form validity is
 * surfaced as an inline error after submit instead of disabling the button
 * ahead of time.
 */
export const shouldDisableSubmit = (isLoading: boolean): boolean => {
    return Boolean(isLoading);
};

/**
 * Normalises the identifier the user types. The current LoginScreen forces
 * the value to lower case so usernames are case-insensitive.
 */
export const normalizeIdentifier = (value: string): string => {
    if (typeof value !== 'string') return '';
    return value.toLowerCase();
};

/**
 * Picks the authentication path for the identifier. If the input looks
 * like an email we use it directly; otherwise we treat it as a username
 * and resolve it via the `get_email_by_username` RPC.
 */
export const looksLikeEmail = (value: string): boolean => {
    if (typeof value !== 'string') return false;
    return value.includes('@');
};
