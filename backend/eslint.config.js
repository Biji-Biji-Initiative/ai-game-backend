// ESLint v9 Configuration
import globals from 'globals';
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
  // Base configuration for all JavaScript files
  js.configs.recommended,
  importPlugin.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'disabled_scripts/',
      'reports/',
      'logs/',
      '.github/',
      '.husky/',
      'supabase/',
      'api-tester-ui/'
    ]
  },
  {
    // Main application code
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'max-len': ['warn', { 
        code: 120, 
        ignoreComments: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true 
      }]
    }
  },
  {
    // Test files
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.mocha,
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
        setTimeout: 'readonly',
        process: 'readonly',
        console: 'readonly',
        require: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-var': 'off',
      'prefer-const': 'off',
      'no-return-await': 'off',
      'require-await': 'off',
      'no-useless-escape': 'off',
      'max-len': ['warn', { 
        code: 120, 
        ignoreComments: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true 
      }]
    }
  }
]; 