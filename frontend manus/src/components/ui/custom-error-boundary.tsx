'use client';

import React, { ErrorInfo } from 'react';

interface CustomErrorBoundaryProps {
  children: React.ReactNode;
}

interface CustomErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Custom error boundary component that works with Next.js 15
 * This replaces the problematic Next.js error boundary
 */
class CustomErrorBoundary extends React.Component<
  CustomErrorBoundaryProps,
  CustomErrorBoundaryState
> {
  constructor(props: CustomErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CustomErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by CustomErrorBoundary:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 rounded-md bg-red-50 text-red-800">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">The application encountered an unexpected error.</p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CustomErrorBoundary; 