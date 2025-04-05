/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/vitest-test-setup.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/tests/examples/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/e2e-tests/**'
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        'src/**/*.d.ts',
        'src/tests/**/*',
        'src/pages/_app.tsx',
        'src/pages/_document.tsx',
        '**/e2e-tests/**'
      ],
    },
    deps: {
      inline: [
        '@testing-library/react',
      ]
    },
    typecheck: {
      tsconfig: './tsconfig.jest.json',
    },
    mockReset: true,
    restoreMocks: true,
    testTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages')
    }
  }
}); 