// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { ImageRef, SaveFormat } from 'expo-image-manipulator';

type ManipulatorModule = typeof import('expo-image-manipulator');
let manipulatorModule: ManipulatorModule | null = null;

// Loaded lazily so this module (and apiService, which imports it) can be
// required in plain Node tests where the native module does not exist.
function loadManipulator(): ManipulatorModule {
  if (!manipulatorModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    manipulatorModule = require('expo-image-manipulator') as ManipulatorModule;
  }
  return manipulatorModule;
}

// Client-side compression applied to every image before it is uploaded:
// at most 1080px wide (never upscaled), 70% quality, WebP.
export const MAX_IMAGE_WIDTH = 1080;
export const IMAGE_QUALITY = 0.7;

export interface PreparedImage {
  uri: string;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
}

const LOCAL_URI = /^(file|content|ph|assets-library):/i;
const NON_COMPRESSIBLE = /\.(gif|mp4|mov|m4v|3gp|webm|mkv|avi)(\?|#|$)/i;

/** True for local still images that should go through the compressor. */
export function isCompressibleImage(uri: string, mimeType?: string | null): boolean {
  if (!uri || !LOCAL_URI.test(uri)) return false;
  if (mimeType) {
    const type = mimeType.toLowerCase();
    if (!type.startsWith('image/') || type === 'image/gif') return false;
  }
  return !NON_COMPRESSIBLE.test(uri);
}

/** Width to resize to, or null when the image is already small enough. */
export function targetWidth(sourceWidth: number, maxWidth: number = MAX_IMAGE_WIDTH): number | null {
  return sourceWidth > maxWidth ? maxWidth : null;
}

/** Best-effort MIME type and extension from a file URI. */
export function guessMediaType(uri: string): { mimeType: string; extension: string } {
  const lower = uri.toLowerCase().split(/[?#]/)[0];
  if (lower.endsWith('.png')) return { mimeType: 'image/png', extension: 'png' };
  if (lower.endsWith('.webp')) return { mimeType: 'image/webp', extension: 'webp' };
  if (lower.endsWith('.gif')) return { mimeType: 'image/gif', extension: 'gif' };
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return { mimeType: 'image/heic', extension: 'heic' };
  if (lower.endsWith('.mp4')) return { mimeType: 'video/mp4', extension: 'mp4' };
  if (lower.endsWith('.mov')) return { mimeType: 'video/quicktime', extension: 'mov' };
  return { mimeType: 'image/jpeg', extension: 'jpg' };
}

async function render(uri: string, format: 'webp' | 'jpeg'): Promise<PreparedImage> {
  const context = loadManipulator().ImageManipulator.manipulate(uri);
  let original: ImageRef | null = null;
  let resized: ImageRef | null = null;
  try {
    original = await context.renderAsync();
    const width = targetWidth(original.width);
    if (width) {
      context.resize({ width });
      resized = await context.renderAsync();
    }
    const saved = await (resized ?? original).saveAsync({ compress: IMAGE_QUALITY, format: format as SaveFormat });
    return {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      mimeType: format === 'webp' ? 'image/webp' : 'image/jpeg',
      extension: format === 'webp' ? 'webp' : 'jpg',
    };
  } finally {
    // Free native bitmaps right away; decoded photos can be tens of megabytes.
    for (const ref of [resized, original, context]) {
      try {
        ref?.release();
      } catch {
        // already released
      }
    }
  }
}

/**
 * Resizes a local image to at most 1080px wide and re-encodes it as WebP at
 * 70% quality. Videos, GIFs and remote URLs are returned unchanged. If WebP
 * encoding fails the image is saved as JPEG; if the image cannot be decoded
 * at all the original file is returned so the upload still goes through.
 */
export async function prepareImageForUpload(
  uri: string,
  mimeType?: string | null,
  opts: { format?: 'webp' | 'jpeg' } = {},
): Promise<PreparedImage> {
  if (!isCompressibleImage(uri, mimeType)) {
    return { uri, ...guessMediaType(uri), ...(mimeType ? { mimeType } : {}) };
  }
  const first = opts.format ?? 'webp';
  try {
    return await render(uri, first);
  } catch (firstError) {
    if (first === 'jpeg') {
      console.warn('Image compression failed, uploading original.', firstError);
      return { uri, ...guessMediaType(uri) };
    }
    console.warn('WebP compression failed, falling back to JPEG.', firstError);
    try {
      return await render(uri, 'jpeg');
    } catch (jpegError) {
      console.warn('Image compression failed, uploading original.', jpegError);
      return { uri, ...guessMediaType(uri) };
    }
  }
}

/** Reads a local file into an ArrayBuffer (works for file:// and content:// on React Native). */
export async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to read local file: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}
