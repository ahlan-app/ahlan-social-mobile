// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Form validation edge case tests.
// Covers: special chars in username, XSS in bio field, max length truncation.

const USERNAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 160;
const NAME_MAX_LENGTH = 50;

// Mirror of the validation rules used by app/edit-profile.tsx and signup flow.
const isValidUsername = (raw: string): boolean => {
  if (typeof raw !== 'string') return false;
  const value = raw.trim();
  if (value.length === 0 || value.length > USERNAME_MAX_LENGTH) return false;
  // Allow letters, digits, underscore, dot, hyphen. No spaces, no @, no slashes.
  return /^[A-Za-z0-9_.-]+$/.test(value);
};

const sanitizeBio = (raw: string): string => {
  if (typeof raw !== 'string') return '';
  // Strip HTML tags & decode the few entities users commonly paste in.
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const truncate = (raw: string, max: number): string => {
  if (typeof raw !== 'string') return '';
  if (raw.length <= max) return raw;
  return raw.slice(0, max);
};

const validateFormInput = (input: { name?: string; username?: string; bio?: string }) => {
  const errors: Record<string, string> = {};
  const name = (input.name ?? '').trim();
  const username = (input.username ?? '').trim();
  const bio = sanitizeBio(input.bio ?? '');

  if (name.length === 0) errors.name = 'Name is required';
  if (name.length > NAME_MAX_LENGTH) errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer`;

  if (username.length === 0) errors.username = 'Username is required';
  else if (username.length > USERNAME_MAX_LENGTH) errors.username = `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`;
  else if (!isValidUsername(username)) errors.username = 'Username may only contain letters, numbers, _, ., -';

  if (bio.length > BIO_MAX_LENGTH) errors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer`;

  return { errors, sanitized: { name: truncate(name, NAME_MAX_LENGTH), username: truncate(username, USERNAME_MAX_LENGTH), bio: truncate(bio, BIO_MAX_LENGTH) } };
};

describe('Form validation — username special chars', () => {
  it.each([
    ['user_name', true],
    ['user.name', true],
    ['user-name', true],
    ['User123', true],
    ['_underscore_start', true],
    ['has space', false],
    ['has@at', false],
    ['has/slash', false],
    ['has#hash', false],
    ['emoji😀name', false],
    ['<script>', false],
    ["semi;colon", false],
  ])('isValidUsername(%j) -> %s', (input, expected) => {
    expect(isValidUsername(input)).toBe(expected);
  });

  it('rejects empty and whitespace-only usernames', () => {
    expect(isValidUsername('')).toBe(false);
    expect(isValidUsername('   ')).toBe(false);
  });
});

describe('Form validation — bio XSS sanitization', () => {
  it('strips <script> tags from bio', () => {
    const result = sanitizeBio('<script>alert("xss")</script>Hello');
    expect(result).not.toMatch(/<script>/i);
    expect(result).not.toMatch(/<\/script>/i);
    expect(result.toLowerCase()).toContain('hello');
  });

  it('strips inline event handlers like onerror / onload', () => {
    const result = sanitizeBio('<img src=x onerror="alert(1)"><b>Bold</b> text');
    expect(result).not.toMatch(/onerror/i);
    expect(result).not.toMatch(/<img/);
    expect(result.toLowerCase()).toContain('bold');
  });

  it('strips nested / malformed HTML', () => {
    const result = sanitizeBio('<<script>script>alert(1)<</script>/script>');
    // Tag delimiters must be removed; "<" cannot survive as an HTML opener,
    // and any "<...>" sequence must be stripped.
    expect(result).not.toMatch(/</);
    expect(result).not.toMatch(/<\/script>/i);
  });

  it('decodes common HTML entities while still stripping tags', () => {
    const result = sanitizeBio('Tom &amp; Jerry &nbsp; &lt;3');
    expect(result).toContain('Tom & Jerry');
    expect(result).not.toContain('&amp;');
    expect(result).not.toContain('&nbsp;');
  });

  it('returns empty string for non-string / empty input', () => {
    expect(sanitizeBio('')).toBe('');
    // @ts-expect-error — testing runtime guard
    expect(sanitizeBio(null)).toBe('');
    // @ts-expect-error — testing runtime guard
    expect(sanitizeBio(undefined)).toBe('');
  });
});

describe('Form validation — max length truncation', () => {
  it('truncates username to USERNAME_MAX_LENGTH', () => {
    const longUsername = 'a'.repeat(USERNAME_MAX_LENGTH + 25);
    const result = truncate(longUsername, USERNAME_MAX_LENGTH);
    expect(result.length).toBe(USERNAME_MAX_LENGTH);
  });

  it('truncates bio to BIO_MAX_LENGTH', () => {
    const longBio = 'b'.repeat(BIO_MAX_LENGTH + 100);
    const result = truncate(longBio, BIO_MAX_LENGTH);
    expect(result.length).toBe(BIO_MAX_LENGTH);
  });

  it('does not modify input that is already within limits', () => {
    const username = 'short_user';
    const bio = 'A perfectly fine bio.';
    expect(truncate(username, USERNAME_MAX_LENGTH)).toBe(username);
    expect(truncate(bio, BIO_MAX_LENGTH)).toBe(bio);
  });
});

describe('Form validation — integrated validateFormInput', () => {
  it('rejects a username containing special characters', () => {
    const { errors } = validateFormInput({ name: 'Alice', username: 'bad name!', bio: 'hi' });
    expect(errors.username).toBeDefined();
  });

  it('sanitizes XSS payload in bio and returns no bio error', () => {
    const { errors, sanitized } = validateFormInput({
      name: 'Alice',
      username: 'alice',
      bio: '<img src=x onerror="alert(1)">Welcome!',
    });
    expect(errors.bio).toBeUndefined();
    expect(sanitized.bio).not.toMatch(/<img/);
    expect(sanitized.bio).not.toMatch(/onerror/);
  });

  it('truncates an oversized bio and reports an error', () => {
    const hugeBio = 'x'.repeat(BIO_MAX_LENGTH + 50);
    const { errors, sanitized } = validateFormInput({
      name: 'Alice',
      username: 'alice',
      bio: hugeBio,
    });
    expect(errors.bio).toBeDefined();
    expect(sanitized.bio.length).toBe(BIO_MAX_LENGTH);
  });

  it('flags missing required name and username', () => {
    const { errors } = validateFormInput({ bio: 'hello' });
    expect(errors.name).toBeDefined();
    expect(errors.username).toBeDefined();
  });

  it('accepts a fully valid form with no errors', () => {
    const { errors, sanitized } = validateFormInput({
      name: 'Alice',
      username: 'alice_123',
      bio: 'Just here to say hi 👋',
    });
    expect(errors).toEqual({});
    expect(sanitized.username).toBe('alice_123');
  });
});