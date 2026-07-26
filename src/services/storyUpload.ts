/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/services/storyUpload.ts
 *
 * Story upload service with bounded exponential backoff retries for transient network and storage errors.
 */

import { supabase } from './supabase';

export interface StoryUploadOptions {
  uri: string;
  mimeType: string;
  maxRetries?: number;
  backoffMs?: number;
}

export interface UploadResult {
  storyId: string;
  url: string;
}

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BACKOFF_MS = 600;
const TRANSIENT_NETWORK_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH']);

export async function uploadStory(options: StoryUploadOptions): Promise<UploadResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const blob = await fetch(options.uri).then(r => r.blob());
      const storyId = crypto.randomUUID();
      const path = `stories/${storyId}`;

      const { error } = await supabase.storage
        .from('stories')
        .upload(path, blob, { contentType: options.mimeType });

      if (error) {
        if (isTransientStorageError(error) && attempt < maxRetries) {
          await sleep(backoffMs * Math.pow(2, attempt));
          attempt += 1;
          continue;
        }
        throw error;
      }

      const { data } = supabase.storage.from('stories').getPublicUrl(path);
      return { storyId, url: data.publicUrl };
    } catch (err: unknown) {
      lastError = err;
      if (!isTransientNetworkError(err) || attempt >= maxRetries) {
        throw err;
      }
      await sleep(backoffMs * Math.pow(2, attempt));
      attempt += 1;
    }
  }

  throw lastError ?? new Error('story upload failed after retries');
}

function isTransientNetworkError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (typeof code === 'string' && TRANSIENT_NETWORK_CODES.has(code)) {
      return true;
    }
  }
  return false;
}

function isTransientStorageError(error: { statusCode?: string }): boolean {
  const status = error.statusCode;
  return status === '503' || status === '504' || status === '429';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
