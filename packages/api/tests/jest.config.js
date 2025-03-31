export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/../src/$1'
  },
  setupFilesAfterEnv: ['./setup/jest.setup.js'],
  testTimeout: 15000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archive/'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '../src/**/*.js',
    '!../src/**/*.test.js',
    '!../src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
