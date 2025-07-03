// jest.config.js
module.exports = {
  testEnvironment: 'jsdom', // Use jsdom for browser-like environment
  transform: { // If Babel is needed for tests
    '^.+\\.js$': 'babel-jest',
  },
  // moduleNameMapper: { // If using aliases like Vite might set up
  //   '^/src/(.*)$': '<rootDir>/src/$1', // Adjust if you have such aliases
  // },
  setupFilesAfterEnv: ['./jest.setup.js'], // Optional: for global mocks or setup
  testMatch: [ // Pattern for test files
      "**/__tests__/**/*.test.js", // Standard Jest pattern
      "**/?(*.)+(spec|test).js"
  ],
  // collectCoverage: true, // Enable coverage reports
  // coverageDirectory: "coverage",
  // coverageReporters: ["json", "lcov", "text", "clover"],
};
