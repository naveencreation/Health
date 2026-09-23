// Force React's development build for tests. A globally-set NODE_ENV=production
// (common on Windows) makes React omit `act`, which breaks
// @testing-library/react-native (`actImplementation is not a function`).
process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'jest-expo',
};
