'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ApiErrorProps {
  error: Error | unknown;
  retry?: () => void;
  title?: string;
}

/**
 * A reusable error component for API errors
 * Displays the error message and optionally provides a retry button
 */
export function ApiError({ error, retry, title = "Error" }: ApiErrorProps) {
  // Extract a user-friendly message from the error
  const message = error instanceof Error 
    ? error.message 
    : "An unknown error occurred";

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{message}</span>
        {retry && (
          <Button onClick={retry} variant="outline" size="sm" className="mt-2 w-fit">
            <RefreshCw className="mr-2 h-3 w-3" /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default ApiError;
