// Types improved by ts-improve-types
/**
 * Flow related types
 */

import { EndpointManager } from '../modules/endpoint-manager';
import { IUIManager } from './ui'; // Assuming IUIManager is here
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { AppController } from '../controllers/AppController'; // Assuming AppController is here
import { APIClient } from '../api/api-client';
// Assuming a ConfigManager type/interface exists, maybe in config module?
// import { ConfigManager } from '../modules/config-manager';

/**
 * Flow Types
 */

export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export enum StepType {
  REQUEST = 'request',
  SCRIPT = 'script',
  CONDITION = 'condition',
  DELAY = 'delay',
  LOG = 'log'
}

/**
 * Base interface for all flow steps
 */
export interface FlowStepBase {
  id: string;
  name: string;
  type: StepType;
  description?: string;
  skipCondition?: string; // Condition string (uses variables)
  skipIf?: string; // Alternative property for skip conditions
  delay?: number; // Optional delay for any step type
  extractVariables?: Array<{ name: string; path: string; defaultValue?: unknown }>; // Allow extracting variables from any step
}

/**
 * Interface for a request step
 */
export interface RequestStep extends FlowStepBase {
  type: StepType.REQUEST;
  endpointId?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  // Array of rules to extract variables from the response of this step
  extractVariables?: Array<{ name: string; path: string; defaultValue?: unknown }>;
}

/**
 * Interface for a delay step
 */
export interface DelayStep extends FlowStepBase {
  type: StepType.DELAY;
  delay?: number; // Make optional, FlowController handles default
}

/**
 * Interface for a conditional step (evaluates condition to decide flow)
 */
export interface ConditionStep extends FlowStepBase {
  type: StepType.CONDITION;
  condition?: string; // Make optional, FlowController checks existence
}

/**
 * Interface for a log step
 */
export interface LogStep extends FlowStepBase {
  type: StepType.LOG;
  message?: string; // Make optional, FlowController checks existence
  level?: 'info' | 'warn' | 'error' | 'debug';
}

// Union type for any possible flow step
export type FlowStep = RequestStep | DelayStep | ConditionStep | LogStep;

/**
 * Interface for a flow definition
 */
export interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  userFriendlyDescription?: string;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Options for FlowController constructor
 */
export interface FlowControllerOptions {
  endpointManager: EndpointManager;
  uiManager: IUIManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  appController?: AppController;
  apiClient?: APIClient;
  config?: Record<string, unknown>;
  configManager?: unknown;
}
