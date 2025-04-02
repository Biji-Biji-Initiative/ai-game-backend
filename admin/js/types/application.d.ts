// Types improved by ts-improve-types
/**
 * Common application types
 */

import { Flow, Step } from '../controllers/FlowController';
import { RequestInfo } from './app-types';
import { IVariableExtractor } from './variables';
import { ResponseViewer } from '../ui/response-viewer';

/**
 * Log Entry Interface
 */
export interface LogEntry {
  level: string;
  message: string;
  timestamp: Date | string;
  correlationId?: string;
  meta?: Record<string, unknown>;
  context?: Record<string, unknown>;
  service?: string;
  filename?: string;
  hostname?: string;
  data?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  args?: unknown[];
}

/**
 * Application State
 */
export interface AppState {
  flows: Flow[];
  currentFlow: Flow | null;
  steps: Step[];
  currentStep: Step | null;
  authToken: string | null;
  stepResults: Record<string, unknown>;
  logs: LogEntry[];
  backendLogs: LogEntry[];
  activeLogsTab: 'frontend' | 'backend';
  currentCorrelationId: string | null;
  currentResponse: Event | null;
  currentRequest: RequestInfo | null;
  variableExtractor?: IVariableExtractor;
  responseViewer?: ResponseViewer;
}

/**
 * DOM Elements interface to help with strongly typed DOM access
 */
export interface DOMElements {
  flowMenu: HTMLElement | null;
  flowSteps: HTMLElement | null;
  stepDetails: HTMLElement | null;
  stepTitle: HTMLElement | null;
  stepDescription: HTMLElement | null;
  formInputs: HTMLElement | null;
  runStepBtn: HTMLElement | null;
  clearFormBtn: HTMLElement | null;
  resultPanel: HTMLElement | null;
  resultStatus: HTMLElement | null;
  resultContent: HTMLElement | null;
  resultBody: HTMLElement | null;
  resultStatusText: HTMLElement | null;
  loadingIndicator: HTMLElement | null;
  themeToggle: HTMLElement | null;
  refreshEndpointsBtn: HTMLElement | null;
  logsPanel: HTMLElement | null;
  logsContent: HTMLElement | null;
  logsList: HTMLElement | null;
  clearLogsBtn: HTMLElement | null;
  [key: string]: HTMLElement | null;
}
