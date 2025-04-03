/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// This imports the required type definitions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Extend the Jest matchers
declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Mock<T = any, Y extends any[] = any[]> {
      mockImplementation(fn?: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockResolvedValue<U extends T>(value: U): this;
      mockRejectedValue(value: Error | unknown): this;
      mockClear(): this;
      mockReset(): this;
      mockRestore(): this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fn<T = any>(): Mock<T>;
    function mocked<T>(item: T, deep?: boolean): jest.Mocked<T>;

    // Extend testing library matchers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Matchers<R, T = any> {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toHaveBeenCalledWith(...args: any[]): R;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toHaveBeenLastCalledWith(...args: any[]): R;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toHaveBeenNthCalledWith(n: number, ...args: any[]): R;
      
      // DOM Testing Library matchers
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toBeEmptyDOMElement(): R;
      toBeInTheDocument(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toBeVisible(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveAccessibleDescription(description?: string | RegExp): R;
      toHaveAccessibleName(name?: string | RegExp): R;
      toHaveAttribute(attr: string, value?: unknown): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, unknown>): R;
      toHaveStyle(css: string | Record<string, unknown>): R;
      toHaveTextContent(content: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
      toHaveValue(value?: string | string[] | number | null): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
    }
  }
}

// Extend the Jest expect interface globally
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any
    interface Matchers<R, T = any> extends jest.JestMatchers<R> {}
  }
}

// This export is necessary to make TypeScript treat this as a module
export {}; 