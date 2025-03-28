module.exports = {
  env: {
    node: true,
    es2021: true,
    mocha: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Code style
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'comma-dangle': ['error', 'only-multiline'],
    'arrow-parens': ['error', 'as-needed'],
    'max-len': ['warn', { code: 100, ignoreComments: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    
    // Best practices
    'curly': 'error',
    'eqeqeq': 'error',
    'no-return-await': 'error',
    'require-await': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Documentation
    'valid-jsdoc': ['warn', {
      requireReturn: false,
      requireReturnType: false,
      requireParamType: false,
      requireParamDescription: true,
      requireReturnDescription: true
    }],
    'jsdoc/require-jsdoc': ['warn', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true
      }
    }]
  },
  plugins: [
    'jsdoc'
  ]
}; 