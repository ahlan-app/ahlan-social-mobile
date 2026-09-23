// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/imageCompression.ts
// Images are resized to max 1080px wide and saved as 70% WebP before upload.

const mockSaveAsync = jest.fn();
const mockResize = jest.fn();
let mockSourceWidth = 4000;
let mockSourceHeight = 3000;

const makeRef = (width: number, height: number) => ({
  width,
  height,
  saveAsync: (options: { compress: number; format: string }) => mockSaveAsync(options, width, height),
  release: jest.fn(),
});

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => {
      let resizedTo: number | null = null;
      const context = {
        resize: (size: { width: number }) => {
          mockResize(size);
          resizedTo = size.width;
          return context;
        },
        renderAsync: jest.fn(async () => {
          if (resizedTo) {
            return makeRef(resizedTo, Math.round((mockSourceHeight * resizedTo) / mockSourceWidth));
          }
          return makeRef(mockSourceWidth, mockSourceHeight);
        }),
        release: jest.fn(),
      };
      return context;
    }),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}), { virtual: true });

import {
  prepareImageForUpload,
  isCompressibleImage,
  targetWidth,
  MAX_IMAGE_WIDTH,
  IMAGE_QUALITY,
} from '../../services/imageCompression';

beforeEach(() => {
  mockSaveAsync.mockReset();
  mockResize.mockReset();
  mockSaveAsync.mockImplementation(async (options: { format: string }, width: number, height: number) => ({
    uri: `file:///cache/out.${options.format === 'webp' ? 'webp' : 'jpg'}`,
    width,
    height,
  }));
  mockSourceWidth = 4000;
  mockSourceHeight = 3000;
});

describe('compression settings', () => {
  it('uses 1080px max width and 0.7 quality', () => {
    expect(MAX_IMAGE_WIDTH).toBe(1080);
    expect(IMAGE_QUALITY).toBe(0.7);
  });

  it('never upscales', () => {
    expect(targetWidth(4000)).toBe(1080);
    expect(targetWidth(1080)).toBeNull();
    expect(targetWidth(640)).toBeNull();
  });
});

describe('isCompressibleImage', () => {
  it('accepts local still images', () => {
    expect(isCompressibleImage('file:///x/photo.jpg')).toBe(true);
    expect(isCompressibleImage('content://media/external/images/1')).toBe(true);
    expect(isCompressibleImage('file:///x/photo.png', 'image/png')).toBe(true);
  });

  it('skips remote files, videos and GIFs', () => {
    expect(isCompressibleImage('https://cdn.example.com/a.jpg')).toBe(false);
    expect(isCompressibleImage('data:image/png;base64,AAAA')).toBe(false);
    expect(isCompressibleImage('file:///x/clip.mp4')).toBe(false);
    expect(isCompressibleImage('file:///x/anim.gif')).toBe(false);
    expect(isCompressibleImage('content://media/1', 'video/mp4')).toBe(false);
  });
});

describe('prepareImageForUpload', () => {
  it('resizes large images to 1080px wide and saves WebP at 0.7', async () => {
    const result = await prepareImageForUpload('file:///x/photo.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: 1080 });
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.7, format: 'webp' }, 1080, 810);
    expect(result).toEqual({
      uri: 'file:///cache/out.webp',
      width: 1080,
      height: 810,
      mimeType: 'image/webp',
      extension: 'webp',
    });
  });

  it('keeps the size of small images but still converts to WebP', async () => {
    mockSourceWidth = 800;
    mockSourceHeight = 600;
    const result = await prepareImageForUpload('file:///x/small.png');
    expect(mockResize).not.toHaveBeenCalled();
    expect(result.mimeType).toBe('image/webp');
    expect(result.width).toBe(800);
  });

  it('falls back to JPEG when WebP encoding fails', async () => {
    mockSaveAsync.mockImplementationOnce(async () => {
      throw new Error('webp unsupported');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await prepareImageForUpload('file:///x/photo.jpg');
    warn.mockRestore();
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
  });

  it('returns videos unchanged', async () => {
    const result = await prepareImageForUpload('file:///x/clip.mp4');
    expect(mockSaveAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ uri: 'file:///x/clip.mp4', mimeType: 'video/mp4', extension: 'mp4' });
  });
});
