const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'warnOfExpoGoPushUsage.js'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('throw new Error(message);')) {
    content = content.replace(
      'throw new Error(message);',
      'if (__DEV__) { didWarn = true; console.warn(message); }'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-expo-notifications] Successfully patched warnOfExpoGoPushUsage.js to prevent fatal crash on Expo Go Android.');
  } else {
    console.log('[patch-expo-notifications] warnOfExpoGoPushUsage.js already patched or throw statement not present.');
  }
} else {
  console.log('[patch-expo-notifications] expo-notifications not found in node_modules, skipping patch.');
}
