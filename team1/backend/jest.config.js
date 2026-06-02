module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 60000, // first run downloads the in-memory mongod binary
  testMatch: ['**/tests/**/*.test.js'],
};
