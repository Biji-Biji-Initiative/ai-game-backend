// Types improved by ts-improve-types
/**
 * UI Components Types Definition
 */

import { VariableManager } from '../modules/variable-manager';

/**
 * ResponseViewer Options
 */
export interface ResponseViewerOptions {
  container: HTMLElement;
  variableManager?: VariableManager;
  showCopyButton?: boolean;
  showDownloadButton?: boolean;
  showToggleFormat?: boolean;
  enableVirtualization?: boolean;
  maxHeight?: string;
}

/**
 * VariableExtractor Options
 */
export interface VariableExtractorOptions {
  variableManager?: VariableManager;
  autoExtract?: boolean;
  suggestionLimit?: number;
}

/**
 * DomainStateViewer Options
 */
export interface DomainStateViewerOptions {
  container: HTMLElement;
  onRequestNeeded?: () => unknown;
  autoFetchEntityTypes?: boolean;
  showBeforeAfterComparison?: boolean;
}
