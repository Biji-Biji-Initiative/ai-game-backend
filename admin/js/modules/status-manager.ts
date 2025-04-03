// Types improved by ts-improve-types
/**
 * StatusManager Module
 * Monitors API health and connectivity status
 */

import { EventBus } from '../core/EventBus';
import { AppStatus } from '../types/status-types';
import { ComponentLogger } from '../core/Logger';

/**
 * Interface for StatusManager options
 */
export interface StatusManagerOptions {
  statusEndpoint?: string;
  updateInterval?: number;
  containerId?: string;
  eventBus: EventBus;
  logger: ComponentLogger;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Partial<StatusManagerOptions> = {
  statusEndpoint: '/api/health',
  updateInterval: 30000, // 30 seconds
  containerId: 'api-status',
};

/**
 * Status information interface
 */
export interface StatusInfo {
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  uptime?: number;
  services?: Record<
    string,
    {
      status: 'ok' | 'degraded' | 'error' | 'unknown';
      message?: string;
    }
  >;
  message?: string;
  timestamp: string;
}

/**
 * StatusManager class
 * Monitors API server status
 */
export class StatusManager {
  private options: Required<StatusManagerOptions>;
  private statusElement: HTMLElement | null = null;
  private updateIntervalId: number | null = null;
  private currentStatus: AppStatus = AppStatus.Initializing;
  private eventBus: EventBus;
  private logger: ComponentLogger;

  /**
   * Creates a new StatusManager instance
   * @param options Manager options
   */
  constructor(options: StatusManagerOptions) {
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<StatusManagerOptions>;

    // Initialize the UI element reference
    this.initializeUI();

    // Log initialization
    this.logger.debug('StatusManager: Initialized');
    this.setupListeners();
  }

  /**
   * Initialize UI elements
   */
  private initializeUI(): void {
    // @ts-ignore - Complex type issues
    if (this.options.containerId) {
      // @ts-ignore - Complex type issues
      this.statusElement = document.getElementById(this.options.containerId); // Property added
    }
  }

  /**
   * Start monitoring API status
   */
  public start(): void {
    // Check status immediately
    this.checkStatus();

    // Set up interval for regular status checks
    this.updateIntervalId = window.setInterval(() => {
      this.checkStatus();
    }, this.options.updateInterval);

    this.logger.info('StatusManager: Started monitoring API status');
  }

  /**
   * Stop monitoring API status
   */
  public stop(): void {
    if (this.updateIntervalId !== null) {
      window.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null; // Property added
      this.logger.info('StatusManager: Stopped monitoring API status');
    }
  }

  /**
   * Check API server status
   */
  private async checkStatus(): Promise<void> {
    try {
      const response = await fetch(this.options.statusEndpoint);

      if (!response.ok) {
        this.updateStatus({
          status: 'error',
          message: `API server returned status: ${response.status}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const statusData = await response.json();
      this.updateStatus(statusData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('StatusManager: Failed to check API status', errorMessage);

      this.updateStatus({
        status: 'error',
        message: `Connection error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update the status information and UI
   * @param statusInfo New status information
   */
  private updateStatus(statusInfo: StatusInfo): void {
    this.currentStatus = statusInfo.status as AppStatus;

    // Update the UI if status element exists
    if (this.statusElement) {
      // Remove existing status classes
      this.statusElement.classList.remove(
        'status-ok',
        'status-degraded',
        'status-error',
        'status-unknown',
      );

      // Add appropriate status class
      this.statusElement.classList.add(`status-${statusInfo.status}`);

      // Update the status indicator color
      const statusIndicator = this.statusElement.querySelector('.status-indicator');
      if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${statusInfo.status}`);
      }

      // Update status text
      const statusTextElement = this.statusElement.querySelector('.status-text');
      if (statusTextElement) {
        let statusText = 'Unknown';

        switch (statusInfo.status) {
          case 'ok':
            statusText = 'Online';
            break;
          case 'degraded':
            statusText = 'Degraded';
            break;
          case 'error':
            statusText = 'Offline';
            break;
        }

        statusTextElement.textContent = statusText;
      }
    }

    // Log status changes
    if (statusInfo.status !== 'ok') {
      this.logger.warn(
        `StatusManager: API status - ${statusInfo.status}${statusInfo.message ? ': ' + statusInfo.message : ''}`,
      );
    } else {
      this.logger.debug('StatusManager: API status - ok');
    }

    this.eventBus.publish('status:changed', {
      status: this.currentStatus,
      data: statusInfo.message,
    });
    this.eventBus.publish(this.currentStatus, statusInfo.message);
  }

  /**
   * Get the current status information
   * @returns Current status information
   */
  public getStatus(): AppStatus {
    return this.currentStatus;
  }

  /**
   * Check if the API is currently available
   * @returns Whether the API is available
   */
  public isApiAvailable(): boolean {
    return this.currentStatus === AppStatus.Ready || this.currentStatus === AppStatus.Degraded;
  }

  private setupListeners(): void {
    this.eventBus.subscribe(AppStatus.Ready, () => this.setStatus(AppStatus.Ready));
    this.eventBus.subscribe(AppStatus.Error, (error: unknown) => this.handleErrorStatus(error));
    // Add other status listeners as needed
  }

  private setStatus(status: AppStatus, data?: unknown): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.logger.info(`Application status changed to: ${status}`);
      this.eventBus.publish('status:changed', { status, data });
      this.eventBus.publish(status, data); // Also publish the specific status event
    }
  }

  private handleErrorStatus(error: unknown): void {
    this.currentStatus = AppStatus.Error;
    this.logger.error('Application entered error state', { error });
    this.eventBus.publish('status:changed', { status: AppStatus.Error, error });
  }
}
