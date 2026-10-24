const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves .cjs files used by Firebase
config.resolver.sourceExts.push('cjs');

// Resolve modern ESM packages such as lucide-react-native. Firebase remains
// compatible through the explicit .cjs source extension above.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
