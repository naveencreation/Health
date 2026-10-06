// Force React's development build for tests. A globally-set NODE_ENV=production
// (common on Windows) makes React omit `act`, which breaks
// @testing-library/react-native (`actImplementation is not a function`).
process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@firebase/([^/]+)$': '<rootDir>/node_modules/@firebase/$1/dist/index.cjs.js',
    '^firebase/ai$': '<rootDir>/node_modules/@firebase/ai/dist/index.cjs.js',
    '^firebase/remote-config$': '<rootDir>/node_modules/@firebase/remote-config/dist/index.cjs.js',
    '^firebase/app-check$': '<rootDir>/node_modules/@firebase/app-check/dist/index.cjs.js',
  },
};
