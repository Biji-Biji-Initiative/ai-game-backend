// Types improved by ts-improve-types
/**
 * Variable extraction and management types
 */

// Assuming necessary imports
import { ResponseViewer } from '../ui/response-viewer';
import { DomainStateManager } from '../modules/domain-state-manager';
import { ApiClient } from '../services/api-client';

/**
 * Variable definition
 */
export interface Variable {
  name: string;
  value: string;
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
  value: string;
  path: string;
  confidence: number;
  source: 'response' | 'domain-state' | 'manual';
}

/**
 * Variable extractor options
 */
export interface VariableExtractorOptions {
  containerId?: string;
  responseViewer?: ResponseViewer;
  domainStateManager?: DomainStateManager;
  apiClient?: ApiClient;
  variablePrefix?: string;
  suggestionsEnabled?: boolean;
  autoExtract?: boolean;
  maxSuggestions?: number;
  suggestionLimit?: number;
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
  extractVariables(respons: Event): Variable[];
  getVariables(): Variable[];

  // Extraction helper methods
  extractFromJson(jso: unknown, path?: string): Variable[];
  extractFromText(tex: string): Variable[];
  extractFromHeaders(header: Record<string, string>): Variable[];

  // Suggestion methods
  suggestVariables(respons: Event): VariableSuggestion[];
  renderSuggestions(suggestion: VariableSuggestion[]): void;

  // UI methods
  render(): void;
  clear(): void;

  // Events
  addEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
  removeEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
}
