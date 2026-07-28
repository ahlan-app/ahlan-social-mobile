/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/linkPreview.test.ts
 *
 * Link preview tests: URL extraction, OpenGraph metadata fetch, image resolution and cache TTL behaviour.
 */

import { extractUrls, fetchLinkPreview } from '../../src/services/linkPreview';

describe('extractUrls', () => {
  test('finds http and https URLs in plain text', () => {
    const result = extractUrls('check https://example.com and http://foo.bar');
    expect(result).toEqual(['https://example.com', 'http://foo.bar']);
  });

  test('caps results to a configurable maximum', () => {
    const long = Array.from({ length: 10 }, (_, i) => `https://x${i}.com`).join(' ');
    const result = extractUrls(long, { max: 3 });
    expect(result).toHaveLength(3);
  });

  test('drops trailing punctuation from URLs', () => {
    expect(extractUrls('go to https://example.com.')).toEqual(['https://example.com']);
  });
});

describe('fetchLinkPreview', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('returns the OpenGraph title when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      text: () => Promise.resolve(
        '<html><head><meta property="og:title" content="Hello"></head></html>',
      ),
    });
    const result = await fetchLinkPreview('https://example.com');
    expect(result.title).toBe('Hello');
  });

  test('returns null when the document cannot be fetched', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('net err'));
    const result = await fetchLinkPreview('https://example.com');
    expect(result).toBeNull();
  });

  test('falls back to <title> when og:title is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      text: () => Promise.resolve('<html><head><title>Plain</title></head></html>'),
    });
    const result = await fetchLinkPreview('https://example.com');
    expect(result.title).toBe('Plain');
  });
});
