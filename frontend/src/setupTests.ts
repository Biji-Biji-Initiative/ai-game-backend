// Import testing library matchers
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// Add the custom matchers from jest-dom
expect.extend({
  toBeInTheDocument(received: unknown) {
    const { toBeInTheDocument } = 
      require('@testing-library/jest-dom/matchers') as any;
    const result = toBeInTheDocument.call(this, received);
    return result;
  },
  toHaveBeenCalled(received: unknown) {
    const pass = received && 
      typeof (received as any).mock === 'object' && 
      typeof (received as any).mock.calls === 'object' &&
      (received as any).mock.calls.length > 0;
    
    return {
      pass,
      message: () => pass 
        ? `expected ${received} not to have been called` 
        : `expected ${received} to have been called`
    };
  },
  toHaveBeenCalledWith(received: unknown, ...args: any[]) {
    const pass = received && 
      typeof (received as any).mock === 'object' && 
      typeof (received as any).mock.calls === 'object' &&
      (received as any).mock.calls.some((call: any[]) => 
        JSON.stringify(call) === JSON.stringify(args));
    
    return {
      pass,
      message: () => pass 
        ? `expected ${received} not to have been called with ${args}` 
        : `expected ${received} to have been called with ${args}`
    };
  },
  toBeDisabled(received: unknown) {
    const { toBeDisabled } = 
      require('@testing-library/jest-dom/matchers') as any;
    const result = toBeDisabled.call(this, received);
    return result;
  },
  toBe(received: unknown, expected: unknown) {
    const pass = Object.is(received, expected);
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be ${expected}`
        : `expected ${received} to be ${expected}`
    };
  }
}); 