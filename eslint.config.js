// ESLint v9 Configuration
import js from '@eslint/js';
import globals from 'globals';

export default [
  // Use recommended JS rules with some customizations
  {
    files: ['**/*.js'],
    ignores: [
      'node_modules/**',
      'tests/**',
      'test/**',
      '**/*.test.js',
      '**/*test*.js',
      'disabled_scripts/**',
      'reports/**',
      'logs/**',
      '.github/**',
      '.husky/**',
      'supabase/**',
      'api-tester-ui/**',
      'coverage/**',
      'dist/**'
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
      noInlineConfig: false
    },
    rules: {
      // Relaxed rules to avoid too many errors during migration
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-empty': 'warn',
      'semi': 'warn',
      'quotes': ['warn', 'single'],
      'comma-dangle': 'off',
      'no-console': 'off',
      'no-multi-spaces': 'off',
      'no-trailing-spaces': 'off',
      'no-mixed-spaces-and-tabs': 'off',
      'space-before-function-paren': 'off',
      'key-spacing': 'off',
      'indent': 'off'
    }
  }
]; 