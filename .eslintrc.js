module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
    mocha: true
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Disable all error-level rules
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-var': 'off',
    'prefer-const': 'off',
    'no-return-await': 'off',
    'require-await': 'off',
    'no-useless-escape': 'off',
    
    // Downgrade linting rules to warnings
    'max-len': ['warn', { 
      code: 120, 
      ignoreComments: true, 
      ignoreStrings: true, 
      ignoreTemplateLiterals: true 
    }],
    
    // Disable JSDoc validation
    'valid-jsdoc': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'tests/',
    'test/',
    '**/*.test.js',
    '**/*test*/',
    'disabled_scripts/',
    'reports/',
    'logs/',
    '.github/',
    '.husky/',
    'supabase/',
    'api-tester-ui/'
  ]
}; 