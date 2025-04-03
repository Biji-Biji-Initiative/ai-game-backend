/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Import the required type definitions
import '@testing-library/jest-dom';

// This file adds TypeScript type definitions for the Testing Library custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Matchers<R> {
      // DOM Testing Library matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeEmpty(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveAccessibleDescription(description?: string | RegExp): R;
      toHaveAccessibleName(name?: string | RegExp): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveTextContent(content: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
      toHaveValue(value?: string | string[] | number | null): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      
      // Jest standard matchers that need to be included
      toBe(expected: any): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(times: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenNthCalledWith(nth: number, ...args: any[]): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
    }
  }
}

// Force TypeScript to process this as a module
export {}; 