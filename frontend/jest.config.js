/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.jest.json',
      isolatedModules: true,
      babelConfig: true
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  moduleNameMapper: {
    // Mock UI components
    '^@/components/ui/alert$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/badge$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/progress$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/card$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/tabs$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/skeleton$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/button$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/switch$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/slider$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/textarea$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    '^@/components/ui/select$': '<rootDir>/src/tests/__mocks__/componentMocks.js',
    // Regular path mappings
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    '/node_modules/(?!@testing-library|react)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx'
  ],
  // Remove globals to avoid deprecated warnings
  // Handle EvaluationBreakdown.tsx 'eval' keyword issue
  testRegex: "(/__(tests|specs)__/.*|(\\.|/)(test|spec))\\.[jt]sx?$"
};
