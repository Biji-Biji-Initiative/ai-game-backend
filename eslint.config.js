import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    ignores: [
      'node_modules/**',
      'tests/**',
      'test/**',
      '**/*.test.js',
      '**/*test*/',
      'disabled_scripts/**',
      'reports/**',
      'logs/**',
      '.github/**',
      '.husky/**',
      'supabase/**',
      'api-tester-ui/**'
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        // Testing
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        // Browser
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Common globals
        Promise: 'readonly',
        Error: 'readonly',
      }
    },
    plugins: {
      jsdoc: jsdoc
    },
    rules: {
      // Error prevention settings - lenient during migration
      'no-unused-vars': 'off',
      'no-undef': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-return-await': 'off',
      'require-await': 'off',
      'no-useless-escape': 'warn',
      
      // Code style
      'max-len': ['warn', { 
        code: 120, 
        ignoreComments: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true 
      }],
      
      // Documentation - recommend but don't enforce during migration
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true
        }
      }]
    }
  },
  // Special handling for CommonJS files during migration
  {
    files: ["**/legacy/**/*.js"],
    languageOptions: {
      sourceType: 'commonjs',
    }
  }
]; 