/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Augment the Jest namespace to include testing-library matchers
declare namespace jest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R, T> {
    toBeInTheDocument(): R;
    toBeDisabled(): R;
    toHaveBeenCalled(): R;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveBeenCalledWith(...args: any[]): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveTextContent(text: string | RegExp): R;
  }
} 