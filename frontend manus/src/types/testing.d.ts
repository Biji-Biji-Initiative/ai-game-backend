/**
 * Consolidated Testing Type Definitions
 * 
 * This file provides all TypeScript type definitions for testing, including:
 * - Jest matchers and utilities
 * - React Testing Library matchers
 * - Custom testing helpers
 */

// Import required libraries
import '@testing-library/jest-dom';

declare global {
  // Add window.typedMockFn utility for tests
  interface Window {
    typedMockFn: <T extends (...args: unknown[]) => unknown>(fn: T) => jest.MockedFunction<T>;
  }

  namespace jest {
    // Mock types - more comprehensive than the default
    interface Mock<T = unknown, Y extends unknown[] = unknown[]> {
      mockImplementation(fn?: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockResolvedValue<U extends T>(value: U): this;
      mockRejectedValue(value: Error | unknown): this;
      mockClear(): this;
      mockReset(): this;
      mockRestore(): this;
    }

    function fn<T = unknown>(): Mock<T>;
    function mocked<T>(item: T, deep?: boolean): jest.Mocked<T>;

    // Extend Jest's Matchers interface with all required matchers
    interface Matchers<R, T = unknown> {
      // Add .not variant
      not: Matchers<R, T>;
      
      // Basic matchers
      toBe(expected: unknown): R;
      toEqual(expected: unknown): R;
      toStrictEqual(expected: unknown): R;
      toHaveLength(expected: number): R;
      toHaveProperty(path: string, value?: unknown): R;
      toBeInstanceOf(expected: unknown): R;
      
      // Boolean matchers
      toBeNull(): R;
      toBeDefined(): R;
      toBeUndefined(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      
      // Number matchers
      toBeGreaterThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
      toBeCloseTo(expected: number, precision?: number): R;
      
      // String matchers
      toMatch(expected: string | RegExp): R;
      
      // Array matchers
      toContain(expected: unknown): R;
      
      // Exception matchers
      toThrow(expected?: string | Error | RegExp): R;
      
      // Mock function matchers
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...args: unknown[]): R;
      toHaveBeenLastCalledWith(...args: unknown[]): R;
      toHaveBeenNthCalledWith(n: number, ...args: unknown[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(count: number): R;
      toHaveReturnedWith(value: unknown): R;
      toHaveLastReturnedWith(value: unknown): R;
      toHaveNthReturnedWith(nth: number, value: unknown): R;
      
      // DOM Testing Library matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toBeEmptyDOMElement(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveAccessibleDescription(expectedAccessibleDescription?: string | RegExp): R;
      toHaveAccessibleName(expectedAccessibleName?: string | RegExp): R;
      toHaveAttribute(attr: string, value?: unknown): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: { [key: string]: unknown }): R;
      toHaveStyle(css: string | { [key: string]: unknown }): R;
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveDescription(text?: string | RegExp): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    }
  }
}

// Export to make TypeScript treat this as a module
export {}; 