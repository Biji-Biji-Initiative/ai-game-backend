/**
 * Common application types
 */

import { Flow, Step } from '../controllers/FlowController';

/**
 * Log Entry Interface
 */
export interface LogEntry {
  level: string;
  message: string;
  timestamp: Date | string;
  correlationId?: string;
  meta?: Record<string, any>;
  context?: Record<string, any>;
  service?: string;
  filename?: string;
  hostname?: string;
  data?: any;
  args?: any[];
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
  stepResults: Record<string, any>;
  logs: LogEntry[];
  backendLogs: LogEntry[];
  activeLogsTab: 'frontend' | 'backend';
  currentCorrelationId: string | null;
  currentResponse: any | null;
  currentRequest: any | null;
  variableExtractor?: any;
  responseViewer?: any;
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