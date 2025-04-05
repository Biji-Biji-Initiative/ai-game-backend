/**
 * This file extends Jest's expect with all custom matchers from jest-dom
 * Import this file in your test files to access matchers like toBeInTheDocument
 */

import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// Get all matchers from jest-dom
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with all matchers
expect.extend(matchers);

// No namespace declaration here - we'll use a different approach

// Export the extended expect object
export { expect }; 