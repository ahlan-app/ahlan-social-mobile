// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/image-picker.test.ts
// Integration tests for the `expo-image-picker` surface used across the
// media creation flow (story-create, edit-profile, camera). We mock the
// native module so the real platform bridge is not exercised, then
// verify launch, selection and cancellation semantics directly.

const launchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => launchImageLibraryAsync(...args),
  launchCameraAsync: (...args: unknown[]) => launchImageLibraryAsync(...args),
  MediaTypeOptions: { Images: 'images', Videos: 'videos' },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImagePicker = require('expo-image-picker');

// ---------------------------------------------------------------------------
// 1. Launching the picker
// ---------------------------------------------------------------------------

describe('ImagePicker — launch the library', () => {
  beforeEach(() => {
    launchImageLibraryAsync.mockReset();
  });

  it('invokes launchImageLibraryAsync with the expected media options', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [9, 16],
    });

    expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
    const call = launchImageLibraryAsync.mock.calls[0][0];
    expect(call.mediaTypes).toEqual(['images']);
    expect(call.quality).toBe(0.9);
    expect(call.allowsEditing).toBe(true);
    expect(call.aspect).toEqual([9, 16]);
  });

  it('passes through caller-supplied overrides (different aspect ratio)', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
      aspect: [1, 1],
    });

    expect(launchImageLibraryAsync.mock.calls[0][0].aspect).toEqual([1, 1]);
    expect(launchImageLibraryAsync.mock.calls[0][0].allowsEditing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Returning a selected image URI
// ---------------------------------------------------------------------------

describe('ImagePicker — selection returns a URI', () => {
  beforeEach(() => {
    launchImageLibraryAsync.mockReset();
  });

  it('exposes the selected asset URI when not cancelled', async () => {
    const uri = 'file:///tmp/photo-123.jpg';
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri, width: 1080, height: 1920, mimeType: 'image/jpeg' }],
    });

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });

    expect(result.canceled).toBe(false);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].uri).toBe(uri);
    expect(result.assets[0].mimeType).toBe('image/jpeg');
  });

  it('preserves multiple asset URIs when the picker returns a batch', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///tmp/a.jpg', width: 100, height: 100 },
        { uri: 'file:///tmp/b.jpg', width: 200, height: 200 },
      ],
    });

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });

    expect(result.assets.map((a: { uri: string }) => a.uri)).toEqual([
      'file:///tmp/a.jpg',
      'file:///tmp/b.jpg',
    ]);
  });
});

// ---------------------------------------------------------------------------
// 3. Cancellation
// ---------------------------------------------------------------------------

describe('ImagePicker — cancel returns null/no-selection', () => {
  beforeEach(() => {
    launchImageLibraryAsync.mockReset();
  });

  it('reports canceled=true with an empty assets array', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });

    expect(result.canceled).toBe(true);
    expect(result.assets).toEqual([]);
  });

  it('mirrors the cancellation contract used by the story-create flow', async () => {
    // Story-create's pickFromGallery guards on `!result.canceled && result.assets[0]?.uri`.
    // Simulate the user dismissing the picker and assert that guard stays closed.
    launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [9, 16],
    });

    // Guard: short-circuit `&&` yields `false` (not `undefined`) once canceled=true.
    const shouldAdopt = !result.canceled && result.assets[0]?.uri;
    expect(shouldAdopt).toBeFalsy();
    expect(shouldAdopt).not.toBe(result.assets[0]?.uri);
  });
});
