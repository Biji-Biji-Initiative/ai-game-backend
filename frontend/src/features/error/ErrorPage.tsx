'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Global error handling component for the app router
 * This catches errors within the app directory and displays a user-friendly error page
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="max-w-lg p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Something went wrong!</h2>
        
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
          <pre className="text-sm">
            <code>
              {error?.message || 'Unknown error'}
            </code>
          </pre>
        </div>
        
        <p className="mb-6">
          Please try again or contact support if the problem persists.
        </p>
        
        <div className="flex space-x-4">
          <Button 
            onClick={() => reset()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Try again
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
} 