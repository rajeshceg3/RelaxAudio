// jest.config.js
module.exports = {
  testEnvironment: 'jest-environment-jsdom', // Explicit package name
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: [
      "**/__tests__/**/*.test.js",
      "**/?(*.)+(spec|test).js"
  ],
};
