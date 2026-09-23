# Android release (Google Play AAB + direct-install APK)

Every release publishes two files on GitHub Releases:

| File | Use |
|---|---|
| `AhlanSocial-vX.Y.Z.aab` | Upload to Google Play Console (Play App Signing) |
| `AhlanSocial-vX.Y.Z.apk` | Direct install on a phone |
| `SHA256SUMS.txt` | Checksums of both |

Both are built by `.github/workflows/android-release.yml` and signed with the
**upload key** (never the debug key). The AAB contains all four ABIs (Play
serves each phone only its own); the APK contains the two ARM ABIs
(`armeabi-v7a`, `arm64-v8a`), which covers practically every Android phone. The workflow fails if the key is missing,
if the tag does not match `app.json`'s version, or if the APK is not 16 KB
page-size aligned.

## One-time setup

1. Upload key. Since v1.0.9 releases are signed with the `ahlan-upload` key
   (`CN=Ahlan Social, OU=Mobile, O=Ahlan Social, L=Istanbul`, certificate
   SHA-256 `7c988d4295b3de0e428c4be12f9504b11b7562bde886fb1e7ab2f2eea611e7d3`).
   Keep the `.jks` file and its password in a password manager and never
   commit it: every future update (Play and APK) must be signed with it.
   v1.0.0–v1.0.8 used an older key that is no longer available, so phones
   with v1.0.8 installed must uninstall it once before installing v1.0.9.
   Blocks made before v1.0.9 were stored only on the device and are lost on
   this uninstall; users must block those accounts again.

2. Repository secrets (Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `ANDROID_UPLOAD_KEYSTORE_BASE64` | `base64 -w0 ahlan-upload.jks` |
   | `ANDROID_UPLOAD_KEYSTORE_PASSWORD` | keystore password |
   | `ANDROID_UPLOAD_KEY_ALIAS` | key alias |
   | `ANDROID_UPLOAD_KEY_PASSWORD` | key password |

   Recommended repository variable `ANDROID_SIGNING_CERT_SHA256` =
   `7c988d4295b3de0e428c4be12f9504b11b7562bde886fb1e7ab2f2eea611e7d3`: the
   build fails if the files are signed with any other key.

## Releasing

1. Bump `expo.version` and `expo.android.versionCode` (must always increase) in `app.json`.
2. Optional: add release notes as `docs/releases/vX.Y.Z.md`.
3. Push a tag `vX.Y.Z` (or run the workflow manually from the Actions tab).

## Local build

```sh
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease assembleRelease \
  -PAHLAN_UPLOAD_STORE_FILE=/abs/path/ahlan-upload.jks \
  -PAHLAN_UPLOAD_STORE_PASSWORD=... -PAHLAN_UPLOAD_KEY_ALIAS=... \
  -PAHLAN_UPLOAD_KEY_PASSWORD=... -PAHLAN_REQUIRE_RELEASE_SIGNING=true
```

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be set
(e.g. in `.env.local`) when bundling.

## Play Console checklist

- targetSdk 36, 16 KB page size, native debug symbols included in the AAB.
- Permissions: CAMERA, POST_NOTIFICATIONS, VIBRATE (+ library defaults such
  as INTERNET). No storage/media read permissions: the gallery uses the system
  photo picker, so no Photo & Video permissions declaration is needed.
- Data safety: account data, photos the user uploads, messages; data is
  encrypted in transit; users can delete their account in the app
  (Settings → Delete account).
- Privacy policy URL and content rating questionnaire are required in the
  Play Console listing.
