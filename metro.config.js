const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves .cjs files used by Firebase
config.resolver.sourceExts.push('cjs');

// Disable unstable package exports to ensure compatibility with Firebase JS SDK
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
