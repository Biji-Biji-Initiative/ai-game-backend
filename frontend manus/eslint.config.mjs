import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  eslint.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // Stage 1: Basic Rules (errors that are easy to fix)
      "curly": ["error", "all"],
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-duplicate-imports": "error",
      
      // Stage 2: React Rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      
      // Stage 3: TypeScript Rules (gradually enable these)
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Will change to error later
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-non-null-assertion": "warn", // Will change to error later
      "@typescript-eslint/no-floating-promises": "warn", // Will change to error later
      
      // Stage 4: Console and Debug Rules
      "no-console": ["warn", { 
        "allow": ["warn", "error"] 
      }],
      
      // Imports
      "import/no-commonjs": "off",
      "import/no-duplicates": "error"
    },
    ignores: [
      ".next",
      "node_modules",
      "public",
      "out",
      "build",
      "dist",
      "**/*.test.{ts,tsx}",  // Temporarily ignore test files
      "**/__tests__/**"      // Temporarily ignore test directories
    ]
  },
  {
    files: ["tailwind.config.js", "postcss.config.js"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "import/no-commonjs": "off"
    }
  }
];

export default eslintConfig;
