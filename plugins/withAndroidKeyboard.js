const { withAndroidManifest } = require('@expo/config-plugins');

// Set windowSoftInputMode to adjustNothing so Android does NOT
// pan or resize the window when the keyboard appears.
// We handle all keyboard avoidance via KeyboardAvoidingView in JS.
module.exports = function withAndroidKeyboard(config) {
  return withAndroidManifest(config, (config) => {
    const activities = config.modResults.manifest.application?.[0]?.activity ?? [];
    const main = activities.find((a) => a.$?.['android:name'] === '.MainActivity');
    if (main) {
      main.$['android:windowSoftInputMode'] = 'adjustNothing';
    }
    return config;
  });
};
