// Ahlan Social — Expo config plugin: Android release signing for Play Store.
//
// `expo prebuild` generates android/app/build.gradle with the release build
// type signed by the public debug keystore. Google Play rejects debug-signed
// bundles, so this plugin wires a real upload key into the release build.
//
// The key is never committed. Provide it through Gradle properties
// (~/.gradle/gradle.properties or -P flags) or environment variables:
//
//   AHLAN_UPLOAD_STORE_FILE      absolute path to the upload keystore (.jks)
//   AHLAN_UPLOAD_STORE_PASSWORD  keystore password
//   AHLAN_UPLOAD_KEY_ALIAS       key alias inside the keystore
//   AHLAN_UPLOAD_KEY_PASSWORD    key password
//
// Set AHLAN_REQUIRE_RELEASE_SIGNING=true (CI does) to fail the build instead
// of falling back to the debug key when the upload key is missing.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @ahlan/release-signing';

const HELPERS = `${MARKER}
def ahlanSigningValue = { String name -> (findProperty(name) ?: System.getenv(name)) }
def ahlanUploadStoreFile = ahlanSigningValue('AHLAN_UPLOAD_STORE_FILE')
def ahlanHasUploadKey = ahlanUploadStoreFile && file(ahlanUploadStoreFile).exists()
def ahlanRequireUploadKey = (ahlanSigningValue('AHLAN_REQUIRE_RELEASE_SIGNING') ?: 'false').toBoolean()
if (ahlanRequireUploadKey && !ahlanHasUploadKey) {
    throw new GradleException("Release signing required but AHLAN_UPLOAD_STORE_FILE is missing or does not exist.")
}
`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (ahlanHasUploadKey) {
                storeFile file(ahlanUploadStoreFile)
                storePassword ahlanSigningValue('AHLAN_UPLOAD_STORE_PASSWORD')
                keyAlias ahlanSigningValue('AHLAN_UPLOAD_KEY_ALIAS')
                keyPassword ahlanSigningValue('AHLAN_UPLOAD_KEY_PASSWORD')
            }
        }`;

function applyReleaseSigning(buildGradle) {
  if (buildGradle.includes(MARKER)) return buildGradle;

  let out = buildGradle.replace(/^android\s*\{/m, (match) => `${HELPERS}\n${match}`);
  if (out === buildGradle) {
    throw new Error('[withAndroidReleaseSigning] could not find the android { } block');
  }

  const withConfig = out.replace(/signingConfigs\s*\{/, (match) => `${match}${RELEASE_SIGNING_CONFIG}`);
  if (withConfig === out) {
    throw new Error('[withAndroidReleaseSigning] could not find signingConfigs { }');
  }
  out = withConfig;

  // Only the release build type switches keys; debug keeps the debug keystore.
  const withBuildType = out.replace(
    /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
    `$1signingConfig ahlanHasUploadKey ? signingConfigs.release : signingConfigs.debug
            // Ship native debug symbols inside the AAB (Play Console crash reports).
            ndk { debugSymbolLevel 'SYMBOL_TABLE' }`
  );
  if (withBuildType === out) {
    throw new Error('[withAndroidReleaseSigning] could not find the release build type signingConfig');
  }
  return withBuildType;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('[withAndroidReleaseSigning] only Groovy build.gradle is supported');
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
