'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Custom error boundary component that doesn't rely on Next.js's built-in error boundary
 * This helps avoid the "_interop_require_default._ is not a function" error
 * 
 * This component includes special handling for errors that occur during server-side rendering
 */
class CustomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    
    // Apply the fix for _interopRequireDefault immediately
    if (typeof global !== 'undefined' && !global._interopRequireDefault?._) {
      try {
        // @ts-expect-error - Dynamically modifying global object
        global._interopRequireDefault = global._interopRequireDefault || function(obj: any) {
          return obj && obj.__esModule ? obj : { default: obj };
        };
        // @ts-expect-error - Dynamically adding the missing _ function
        global._interopRequireDefault._ = function(obj: any) {
          return obj && obj.__esModule ? obj : { default: obj };
        };
      } catch (e) {
        console.warn('Failed to patch global._interopRequireDefault', e);
      }
    }
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
    
    // Apply fix for _interopRequireDefault._ if needed
    if (error.message && error.message.includes("_interopRequireDefault._")) {
      try {
        // Try to patch at runtime
        if (typeof window !== 'undefined') {
          // @ts-expect-error - Dynamically adding to window
          if (window._interopRequireDefault && !window._interopRequireDefault._) {
            console.log('Adding missing _interopRequireDefault._ function');
            // @ts-expect-error - Dynamically adding the missing _ function
            window._interopRequireDefault._ = function(obj: any) {
              return obj && obj.__esModule ? obj : { default: obj };
            };
          }
        }
      } catch (err) {
        console.warn('Failed to patch _interopRequireDefault at runtime', err);
      }
    }
  }

  render(): React.ReactNode {
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

// Add global type definition for _interopRequireDefault
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _interopRequireDefault: ((obj: any) => any) & { _?: (obj: any) => any } | undefined;
}

export default CustomErrorBoundary; 