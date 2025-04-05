/**
 * Enhanced Vitest Test Setup File
 * 
 * This file breaks circular dependencies FIRST, then
 * imports the regular vitest-setup.ts file.
 */

// CRITICAL: Import setupCoreMocks FIRST and call it immediately to break circular deps
import { setupCoreMocks } from './component-test-helpers';
setupCoreMocks(); 

// AFTER circular deps are broken, import the regular setup file
import './vitest-setup';

// Global console.log override for cleaner test output
const originalLog = console.log;
console.log = function(...args) {
  // Filter out React Query dev tools messages
  if (args[0] && typeof args[0] === 'string' && 
      (args[0].includes('[react-query]') || args[0].includes('[TanStack Query]'))) {
    return;
  }
  originalLog(...args);
}; 