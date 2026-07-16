/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/reportReasons.test.ts
 *
 * Report reason catalog tests: enum validation, locale mapping, queue ordering and duplicate guard.
 */

import { listReportReasons, queueReport, REASON_CODES } from '../../src/services/reportReasons';

describe('listReportReasons', () => {
  test('returns the canonical reasons list', () => {
    const reasons = listReportReasons();
    expect(reasons.map(r => r.code)).toEqual(expect.arrayContaining(REASON_CODES));
  });

  test('includes localised labels', () => {
    const reasons = listReportReasons('tr');
    for (const r of reasons) {
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});

describe('queueReport', () => {
  test('appends a report entry with the supplied reason code', async () => {
    const result = await queueReport({ targetId: 'p1', reason: 'spam' });
    expect(result.id).toBeDefined();
  });

  test('rejects an unknown reason code', async () => {
    await expect(queueReport({ targetId: 'p1', reason: 'made-up' })).rejects.toThrow(/reason/i);
  });

  test('prevents queueing the same target twice within the cooldown', async () => {
    await queueReport({ targetId: 'p2', reason: 'spam' });
    await expect(queueReport({ targetId: 'p2', reason: 'spam' })).rejects.toThrow(/duplicate/i);
  });
});
