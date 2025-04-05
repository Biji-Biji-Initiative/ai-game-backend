import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, waitFor, cleanup, screen, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '../contexts/api-context';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Types for API response mocking
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a mocked API success response with the correct type
 */
export function createMockApiSuccess<T>(data: T, message = 'Success'): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    statusCode: 200
  };
}

/**
 * Creates a mocked API error response with the correct type
 */
export function createMockApiError(
  error = 'An error occurred',
  statusCode = 400,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    statusCode,
    details
  };
}

// Mock the Next.js router for App Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Create a new query client for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Use modern properties instead of deprecated ones
      gcTime: 0,
      staleTime: 0,
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

// Define a custom render result type that includes our additional properties
interface CustomRenderResult extends RenderResult {
  queryClient: QueryClient;
  waitForLoadingToFinish: () => Promise<void>;
}

// Helper function to wait for the next paint
async function waitForComponentToPaint(): Promise<void> {
  return React.act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

const AllTheProviders = ({ children, queryClient }: { children: React.ReactNode, queryClient: QueryClient }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
};

/**
 * Renders a React component with all providers needed for testing
 * @param ui - Component to render
 * @param options - Render options
 * @returns Rendered component with utility methods
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
): CustomRenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);

  // Create a simple render function that doesn't use act or async behavior
  const renderResult = render(
    <AllTheProviders queryClient={queryClient}>{ui}</AllTheProviders>,
    { container, ...renderOptions }
  );

  // Create the result with our custom properties
  const result = {
    ...renderResult,
    queryClient,
    // Keep the original rerender function
    waitForLoadingToFinish: async () => {
      await waitFor(
        () => {
          const loader = document.querySelector('[aria-label="loading"]');
          if (loader) {
            throw new Error('Still loading');
          }
        },
        { timeout: 5000 }
      );
    }
  } as CustomRenderResult;

  // Clean up container when component is unmounted
  const originalUnmount = result.unmount;
  result.unmount = () => {
    originalUnmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  };

  return result;
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Explicitly re-export commonly used functions 
export { waitFor, screen };
export { expect, vi } from 'vitest';
export const act = React.act;
