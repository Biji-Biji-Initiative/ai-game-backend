import React, { ReactElement } from 'react';
import { render, RenderOptions, waitFor, cleanup, screen } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '../contexts/api-context';

// Mock the Next.js router for App Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Create a fresh query client for each test to avoid shared state
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    // For tests we're turning off error logs since react 19 can be noisy
    error: () => {},
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

// This helper handles the async rendering in React
async function waitForComponentToPaint(): Promise<void> {
  // Small delay to allow React's concurrent rendering to complete
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Add in providers here
const AllTheProviders = ({ children, queryClient }: { children: React.ReactNode, queryClient: QueryClient }) => {
  return (
    <ApiProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ApiProvider>
  );
};

export async function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Clean up before each test to avoid side effects
  cleanup();
  
  let renderResult: ReturnType<typeof render>;
  
  // Create a container element
  const container = document.createElement('div');
  document.body.appendChild(container);

  try {
    // Use a single act call to handle all state updates
    await act(async () => {
      renderResult = render(ui, { 
        wrapper: ({ children }) => <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>, 
        ...renderOptions,
        container 
      });
      
      // Wait for rendering to stabilize
      await waitForComponentToPaint();
      
      // Wait for any pending queries to complete
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    return {
      ...renderResult!,
      queryClient,
      // Add a re-render function
      rerender: (rerenderUi: ReactElement) => {
        renderResult!.rerender(
          <AllTheProviders queryClient={queryClient}>{rerenderUi}</AllTheProviders>
        );
        return renderResult!;
      },
      // Add a cleanup function
      unmount: () => {
        renderResult!.unmount();
        document.body.removeChild(container);
      },
      // Add a helper for waiting for loading states
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
    };
  } catch (error) {
    // Clean up container to prevent memory leaks if rendering fails
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Error during test rendering:', error);
    throw error;
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Explicitly re-export commonly used functions 
export { waitFor, screen };
export { act };
export { expect } from '@jest/globals';
