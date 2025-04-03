'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

interface ApiErrorProps {
  title?: string;
  error: Error | string | null;
  retry?: () => void;
  className?: string;
}

/**
 * ApiError component
 * Displays errors from API calls in a consistent format
 */
export const ApiError: React.FC<ApiErrorProps> = ({
  title = 'Error',
  error,
  retry,
  className = '',
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || 'An unexpected error occurred';

  return (
    <Card className={`border-red-200 dark:border-red-900 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-base font-medium text-red-600 dark:text-red-400">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-gray-700 dark:text-gray-300">{errorMessage}</p>
      </CardContent>
      
      {retry && (
        <CardFooter className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retry}
            className="w-full text-xs"
          >
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ApiError;
