/**
 * Custom TypeScript declaration file for Jest DOM matchers
 * 
 * This file adds type support for jest-dom matchers that might not be 
 * properly recognized after updating to TypeScript 5+ and React 19
 */

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    // Use a type augmentation approach instead of interface extension
    interface JestMatchers<R, T = unknown> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | string[] | number | null): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(css: Record<string, string | number>): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: unknown[]): R;
      toContainElement(element: HTMLElement | null): R;
      toHaveFocus(): R;
    }
  }
} 