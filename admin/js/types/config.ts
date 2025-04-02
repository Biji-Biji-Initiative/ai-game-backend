// Types improved by ts-improve-types
/**
 * Global configuration types
 */

export interface Config {
  baseUrl: string;
  apiPath: string;
  authEnabled: boolean;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  useLocalStorage?: boolean;
  theme?: string;
  debug?: boolean;
  features?: {
    history?: boolean;
    variables?: boolean;
    stateTracking?: boolean;
    authentication?: boolean;
  };
}
