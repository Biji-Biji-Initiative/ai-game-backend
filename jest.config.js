export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 15000,
  testPathIgnorePatterns: ['/node_modules/', '/archive/']
}; 