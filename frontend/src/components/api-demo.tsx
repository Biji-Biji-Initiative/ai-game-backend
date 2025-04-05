'use client';

import React, { useState } from 'react';
import { apiClient, createApiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/utils/logger';

/**
 * API Client Demo Component
 * Shows how to use both the MockApiClient and RealApiClient implementations
 */
export const ApiClientDemo: React.FC = () => {
  const [useMock, setUseMock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // This example function shows how to make an API call with our client
  const makeApiCall = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, we'd just use the apiClient instance which is configured
      // by the factory. This demo creates a client manually for illustration.
      let client = apiClient;
      
      // If toggled to use a real client, create a RealApiClient instance
      if (!useMock) {
        // Use the factory function to create the client
        client = createApiClient({ mockMode: false });
        
        // Log that we're using a real client
        logger.info('Using RealApiClient for API request', {}, 'ApiDemo');
      } else {
        logger.info('Using MockApiClient for API request', {}, 'ApiDemo');
      }
      
      // Make a request to get user info
      const response = await client.get('/user/profile');
      
      // Log the response
      logger.info('API Response', { response }, 'ApiDemo');
      
      if (response.ok) {
        setResults(response.data as Record<string, unknown>);
      } else {
        setError(typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Unknown error');
      }
    } catch (err) {
      logger.error('API call failed', { error: err }, 'ApiDemo');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>API Client Demo</CardTitle>
        <CardDescription>
          Test the API client implementation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <Switch
            id="use-mock"
            checked={useMock}
            onCheckedChange={setUseMock}
          />
          <Label htmlFor="use-mock">Use Mock Client</Label>
          <Badge variant={useMock ? "default" : "secondary"} className="ml-2">
            {useMock ? "Mock" : "Real"}
          </Badge>
        </div>
        
        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {results && (
          <div className="bg-slate-50 p-3 rounded border mb-4">
            <p className="font-semibold mb-2">Results:</p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={makeApiCall} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Loading..." : "Make API Call"}
        </Button>
      </CardFooter>
    </Card>
  );
}; 