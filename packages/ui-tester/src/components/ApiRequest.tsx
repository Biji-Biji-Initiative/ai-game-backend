import React, { useState } from 'react';
import { useApiRequest } from '../hooks/useApiRequest';
import 'react-json-pretty/themes/monikai.css';
import { ApiEndpoint } from '../types/api';

interface ApiRequestProps {
  endpoint: ApiEndpoint;
  baseUrl: string;
  pathParams?: Array<{ name: string; value: string }>;
  queryParams?: Array<{ name: string; value: string }>;
  body?: any;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

const ApiRequest: React.FC<ApiRequestProps> = ({
  endpoint,
  baseUrl,
  pathParams = [],
  queryParams = [],
  body = null,
  onSuccess,
  onError
}) => {
  const [response, setResponse] = useState<any>(null);
  const { isLoading, error, data, responseTime, makeRequest } = useApiRequest({
    endpoint,
    baseUrl
  });

  const handleRequest = async () => {
    try {
      const result = await makeRequest({
        pathParams,
        queryParams,
        body
      });

      setResponse(result);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (onError) {
        onError(err);
      }
    }
  };

  // Format JSON for display
  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="api-request">
      <button
        onClick={handleRequest}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
      >
        {isLoading ? 'Sending...' : 'Send Request'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
          <h4 className="font-bold">Error:</h4>
          <p>{error.message}</p>
          {error.status && <p>Status: {error.status}</p>}
        </div>
      )}

      {data && (
        <div className="mt-4">
          <h4 className="font-medium">Response:</h4>
          <div className="my-2 text-sm text-gray-500">
            Time: {responseTime}ms
          </div>
          <div className="bg-gray-800 rounded overflow-auto p-4 text-white">
            <pre className="font-mono text-sm whitespace-pre-wrap">{formatJSON(data)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiRequest;
