// Ahlan Social — dynamic Expo config layered on top of app.json.
//
// google-services.json (Firebase / FCM) is not committed to the repository.
// When it is missing, drop `android.googleServicesFile` so `expo prebuild`
// does not fail; push notifications then fall back to in-app delivery.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const android = { ...config.android };
  const googleServicesPath = android.googleServicesFile
    ? path.resolve(__dirname, android.googleServicesFile)
    : null;

  if (googleServicesPath && !fs.existsSync(googleServicesPath)) {
    delete android.googleServicesFile;
  }

  return { ...config, android };
};
