// ESLint v9 Configuration
import eslint from '@eslint/js';
import globals from 'globals';
import eslintPluginN from 'eslint-plugin-n';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginJSDoc from 'eslint-plugin-jsdoc';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.mocha
      }
    },
    plugins: {
      n: eslintPluginN,
      import: eslintPluginImport,
      jsdoc: eslintPluginJSDoc
    },
    rules: {
      // ESM-specific rules
      'import/extensions': ['error', 'ignorePackages'],
      'n/no-missing-import': 'error',
      'n/no-unsupported-features/es-syntax': ['error', {
        version: '>=16.0.0',
        ignores: []
      }],
      
      // Downgrade linting rules to warnings during migration
      'max-len': ['warn', { 
        code: 120, 
        ignoreComments: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true 
      }],
      
      // Disable temporarily during migration
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'import/no-unresolved': 'warn'
    },
    ignores: [
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
  }
]; 