export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 15000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archive/'
  ]
};
