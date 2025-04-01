/**
 * Variable extraction and management types
 */

/**
 * Variable definition
 */
export interface Variable {
  name: string;
  value: any;
  type?: string;
  description?: string;
  scope?: string;
  source?: string;
  timestamp?: number;
}

/**
 * Variable suggestion
 */
export interface VariableSuggestion {
  name: string;
  value: any;
  path: string;
  confidence: number;
  source: 'response' | 'domain-state' | 'manual';
}

/**
 * Variable extractor options
 */
export interface VariableExtractorOptions {
  containerId?: string;
  responseViewer?: any;
  domainStateManager?: any;
  apiClient?: any;
  variablePrefix?: string;
  suggestionsEnabled?: boolean;
  autoExtract?: boolean;
  maxSuggestions?: number;
}

/**
 * Variable manager options
 */
export interface VariableManagerOptions {
  storageKey?: string;
  persistVariables?: boolean;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  maxVariables?: number;
  variablePrefix?: string;
}

/**
 * Variable extractor interface
 */
export interface IVariableExtractor {
  // Core methods
  extractVariables(response: any): Variable[];
  getVariables(): Variable[];
  
  // Extraction helper methods
  extractFromJson(json: any, path?: string): Variable[];
  extractFromText(text: string): Variable[];
  extractFromHeaders(headers: Record<string, string>): Variable[];
  
  // Suggestion methods
  suggestVariables(response: any): VariableSuggestion[];
  renderSuggestions(suggestions: VariableSuggestion[]): void;
  
  // UI methods
  render(): void;
  clear(): void;
  
  // Events
  addEventListener(event: string, handler: (data: any) => void): void;
  removeEventListener(event: string, handler: (data: any) => void): void;
} 