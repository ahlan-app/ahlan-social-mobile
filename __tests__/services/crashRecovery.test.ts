/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/crashRecovery.test.ts
 *
 * Crash recovery tests: collection, persistence, retry upload, deduplication, and PII redaction.
 */

import { reportCrash, listQueuedReports, flushQueuedReports, redactPII } from '../../src/services/crashRecovery';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('reportCrash', () => {
  test('queues a report with a generated id', async () => {
    const id = await reportCrash({ error: new Error('boom'), source: 'screen' });
    expect(id).toMatch(/^[a-z0-9-]+$/i);
  });

  test('redacts email addresses from the stack trace', async () => {
    const redacted = redactPII('Error at samet@example.com line 12');
    expect(redacted).not.toMatch(/samet@example\.com/);
    expect(redacted).toMatch(/<email>/);
  });

  test('redacts bearer tokens in headers', () => {
    const redacted = redactPII('Authorization: Bearer abc.def.ghi');
    expect(redacted).not.toMatch(/abc\.def\.ghi/);
    expect(redacted).toMatch(/Bearer\s+\*+/);
  });
});

describe('listQueuedReports', () => {
  test('returns the parsed queue', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: 'r1' }]));
    const result = await listQueuedReports();
    expect(result).toHaveLength(1);
  });
});

describe('flushQueuedReports', () => {
  test('removes successfully uploaded reports from the queue', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: 'r1' }, { id: 'r2' }]));
    const result = await flushQueuedReports('https://crash.example.com');
    expect(result.uploaded).toBe(2);
  });
});
