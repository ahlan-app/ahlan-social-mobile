// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Shared list of reasons offered in the "Report user / Report post" flow.
// Extracted from app/user/[username].tsx so it can be reused by every
// surface that opens a report sheet (user profile, post card, reposts,
// etc.) and so it can be unit-tested without pulling in React Native.

export const REPORT_REASONS: readonly string[] = [
  "It's spam",
  'Hate speech or symbols',
  'Harassment or bullying',
  'Pretending to be someone else',
  'False information',
  'Nudity or sexual activity',
  "I just don't like their content",
];

export type ReportTargetType = 'post' | 'user';

export interface ReportSubmission {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

/**
 * Shape a `reports` table insert row for the given selection.
 * Centralised here so tests can assert the contract without spinning up
 * the supabase mock.
 */
export const buildReportRow = (submission: ReportSubmission) => ({
  reporter_id: submission.reporterId,
  target_type: submission.targetType,
  target_id: submission.targetId,
  reason: submission.reason,
});

/**
 * The toast text shown after a successful submission. Mirrors the copy
 * used in app/user/[username].tsx so the test suite pins the wording.
 */
export const REPORT_SUCCESS_TOAST = 'Report submitted. Thank you for your feedback.';
export const REPORT_FAILURE_TOAST = 'Failed to submit report. Please try again.';
export const REPORT_NOT_LOADED_TOAST = 'Unable to report — user not loaded.';