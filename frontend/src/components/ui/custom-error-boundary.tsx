'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Custom error boundary component that doesn't rely on Next.js's built-in error boundary
 * This helps avoid the "_interop_require_default._ is not a function" error
 */
class CustomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Caught error:', error, errorInfo);

    // Apply exports/module fix if the error is related to missing exports
    if (error.message && error.message.includes("exports")) {
      if (typeof window !== 'undefined') {
        window.exports = window.exports || {};
        window.module = window.module || { exports: {} };
      }
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="max-w-lg p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
              Something went wrong!
            </h2>
            
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
              <pre className="text-sm">
                <code>
                  {this.state.error?.message || 'Unknown error'}
                </code>
              </pre>
            </div>
            
            <p className="mb-6">
              Please try again or contact support if the problem persists.
            </p>
            
            <div className="flex space-x-4">
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Try again
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CustomErrorBoundary; 