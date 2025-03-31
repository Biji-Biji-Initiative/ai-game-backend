import React from 'react';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiEndpoint {
  name: string;
  method: ApiMethod;
  path: string;
  description: string;
  category: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responseExample: any;
}

export interface ApiParameter {
  name: string;
  required: boolean;
  description: string;
  schema: {
    type: string;
    enum?: string[];
    [key: string]: any;
  };
}

export interface ApiRequestBody {
  name: string;
  required: boolean;
  content: {
    'application/json': {
      schema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
        [key: string]: any;
      };
    };
  };
}

export interface ApiError extends Error {
  status?: number;
  details?: any;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    details?: any;
  };
}

export interface TestResult {
  success: boolean;
  data?: any;
  error?: ApiError;
  responseTime?: number;
  timestamp: number;
}

export interface TestHistory {
  endpoint: string;
  method: ApiMethod;
  requestBody?: any;
  headers?: Record<string, string>;
  result: TestResult;
}

// Interface for variable extraction from responses
export interface VariableExtraction {
  id: string;
  name: string;
  jsonPath: string;
}

export interface ScenarioStep {
  id: string;
  name: string;
  endpoint: ApiEndpoint;
  pathParams: Array<{ name: string; value: string }>;
  queryParams: Array<{ name: string; value: string }>;
  requestBody: any;
  response?: any;
  status?: 'pending' | 'success' | 'error';
  delay?: number;
  variableExtractions?: VariableExtraction[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  createdAt: string;
  updatedAt: string;
}
