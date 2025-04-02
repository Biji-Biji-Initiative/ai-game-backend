// Types improved by ts-improve-types
/**
 * Backend Logs Manager Module
 * Handles fetching and managing logs from the backend
 */
import { logger } from '../utils/logger';
// import { EventEmitter } from 'events'; // Removed Node.js dependency
import { ApiClient } from '../api/api-client';
import { ComponentLogger } from '../core/Logger';
import { Logger } from '../utils/logger';
import { EventEmitter } from '../utils/event-emitter';
import { APIClient } from '../api/api-client';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  [key: string]: any;
}

export interface BackendLogsManagerOptions {
  logsEndpoint?: string;
  fetchInterval?: number;
  maxLogEntries?: number;
  apiClient?: any;
  maxLogsToFetch?: number;
  refreshInterval?: number | null;
  autoRefresh?: boolean;
  apiUrl?: string;
}

interface LogsResponse {
  status: string;
  data: {
    logs: LogEntry[];
    logFile?: string;
    count?: number;
  };
}

interface FetchLogsOptions {
  correlationId?: string | undefined;
  level?: string | undefined;
  limit?: number;
  search?: string | undefined;
  source?: string;
  [key: string]: any;
}

interface FilterOptions {
  level?: string | string[];
  correlationId?: string;
  search?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  [key: string]: any;
}

/**
 * Class for managing backend logs
 */
export class BackendLogsManager extends EventEmitter {
  // Removed inheritance
  private options: BackendLogsManagerOptions;
  private apiClient: unknown | null;
  private logs: LogEntry[] = [];
  private logSource: EventSource | null = null;
  private reconnectInterval = 5000; // Interval in ms to attempt reconnection
  private maxReconnectAttempts = 5;
  private currentReconnectAttempts = 0;
  private logger: ComponentLogger;
  private isLoadingLogs: boolean;
  private lastError: Error | null;
  private eventListeners: Map<string, Function[]>;
  private refreshIntervalId: ReturnType<typeof setInterval> | null;

  /**
   * Creates a new BackendLogsManager instance
   * @param options - Configuration options
   */
  constructor(options: BackendLogsManagerOptions) {
    super(); // Call super constructor for EventEmitter
    this.options = {
      apiUrl: '/api/logs/stream',
      apiClient: null,
      ...options,
    };
    this.apiClient = this.options.apiClient;
    this.logger = ComponentLogger.getLogger('BackendLogsManager');
    this.isLoadingLogs = false;
    this.lastError = null;
    this.eventListeners = new Map();
    this.refreshIntervalId = null;

    // Start auto-refresh if enabled
    if (this.options.autoRefresh && this.options.refreshInterval) {
      this.startAutoRefresh();
    }
  }

  /**
   * Adds an event listener
   * @param event - The event name
   * @param callback - The callback function
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }

  /**
   * Removes an event listener
   * @param event - The event name
   * @param callback - The callback function to remove
   */
  off(event: string, callback: Function): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emits an event to listeners.
   * Make this public to match EventEmitter
   */
  public emit(event: string, data: any[] | Record<string, unknown> = null): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach((callback: Function) => {
          try {
            callback(data);
          } catch (error) {
            this.logger.error(`Error in event listener for ${event}:`, error);
          }
        });
      }
    }
  }

  /**
   * Fetches logs from the backend
   * @param options - Fetch options
   * @returns The fetched logs
   */
  async fetchLogs(option: FetchLogsOptions = {}): Promise<LogEntry[]> {
    const fetchOptions: FetchLogsOptions = {
      correlationId: option.correlationId || undefined,
      level: option.level || undefined,
      limit: option.limit || this.options.maxLogsToFetch,
      search: option.search || undefined,
      ...option,
    };

    this.isLoadingLogs = true;
    this.emit('logs:loading', { options: fetchOptions });

    try {
      // Build the URL with query parameters
      const logsEndpoint = this.options.logsEndpoint || '/api/logs';
      const url = new URL(logsEndpoint, window.location.origin);
      if (fetchOptions.correlationId) {
        url.searchParams.append('correlationId', fetchOptions.correlationId);
      }
      if (fetchOptions.level) url.searchParams.append('level', fetchOptions.level);
      if (fetchOptions.limit) url.searchParams.append('limit', String(fetchOptions.limit));
      if (fetchOptions.search) url.searchParams.append('search', fetchOptions.search);

      // Fetch the logs
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as LogsResponse;

      if (
        !data.status ||
        data.status !== 'success' ||
        !data.data ||
        !Array.isArray(data.data.logs)
      ) {
        throw new Error('Invalid response format');
      }

      // Store logs
      this.logs = data.data.logs;
      this.lastError = null;

      // Emit loaded event
      this.emit('logs:loaded', {
        logs: this.logs,
        count: this.logs.length,
        source: option.source || 'manual',
        logFile: data.data.logFile,
      });

      // Also emit logsReceived for compatibility
      this.emit('logsReceived', this.logs);

      return this.logs;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));

      // Emit error event
      this.emit('logs:error', {
        error: this.lastError,
        message: this.lastError.message,
      });

      throw this.lastError;
    } finally {
      this.isLoadingLogs = false;
    }
  }

  /**
   * Refreshes logs by fetching them again
   * @param options - Refresh options
   * @returns The refreshed logs
   */
  async refreshLogs(options: FetchLogsOptions = {}): Promise<LogEntry[]> {
    // Emit refreshing event
    this.emit('logs:refreshing', { options });

    try {
      return await this.fetchLogs({
        ...options,
        source: 'refresh',
      });
    } catch (error) {
      // Error is already emitted in fetchLogs
      throw error;
    }
  }

  /**
   * Starts auto-refreshing logs at the configured interval.
   * @param interval Optional interval in milliseconds to override the default.
   */
  startAutoRefresh(interval?: number): void {
    this.stopAutoRefresh(); // Stop any existing interval

    const refreshInterval = interval ?? this.options.refreshInterval;
    if (refreshInterval && refreshInterval > 0) {
      this.refreshIntervalId = setInterval(() => {
        this.fetchLogs();
      }, refreshInterval);
      this.emit('logs:autoRefreshStarted', { interval: refreshInterval });
      this.logger.info(`Backend logs auto-refresh started with interval: ${refreshInterval}ms`);
    } else {
      this.logger.info('Backend logs auto-refresh not started (no interval configured).');
    }
  }

  /**
   * Stops auto-refreshing logs
   */
  stopAutoRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;

      this.emit('logs:autoRefreshStopped');
    }
  }

  /**
   * Filters logs based on criteria
   * @param filters - Filter criteria
   * @returns Filtered logs
   */
  filterLogs(filters: FilterOptions = {}): LogEntry[] {
    return this.logs.filter(log => {
      // Filter by level
      if (filters.level) {
        if (Array.isArray(filters.level)) {
          if (!filters.level.includes(log.level)) {
            return false;
          }
        } else if (log.level !== filters.level) {
          return false;
        }
      }

      // Filter by correlation ID
      if (filters.correlationId && log.correlationId !== filters.correlationId) {
        return false;
      }

      // Filter by search text
      if (filters.search) {
        const searchText = filters.search.toLowerCase();
        const messageMatch = log.message && log.message.toLowerCase().includes(searchText);
        const contextMatch =
          log.context && JSON.stringify(log.context).toLowerCase().includes(searchText);

        if (!messageMatch && !contextMatch) {
          return false;
        }
      }

      // Filter by time range
      if (filters.startTime) {
        const startTime =
          typeof filters.startTime === 'string' ? new Date(filters.startTime) : filters.startTime;

        const logTime = new Date(log.timestamp);
        if (logTime < startTime) {
          return false;
        }
      }

      if (filters.endTime) {
        const endTime =
          typeof filters.endTime === 'string' ? new Date(filters.endTime) : filters.endTime;

        const logTime = new Date(log.timestamp);
        if (logTime > endTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Gets all logs
   * @returns All logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Checks if logs are currently being loaded
   * @returns Whether logs are being loaded
   */
  getIsLoading(): boolean {
    return this.isLoadingLogs;
  }

  /**
   * Gets the last error that occurred
   * @returns The last error or null
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Gets logs with a specific correlation ID
   * @param correlationId The correlation ID to filter by
   * @returns Logs with the specified correlation ID
   */
  getLogsByCorrelationId(correlationId: string): LogEntry[] {
    return this.logs.filter(log => log.correlationId === correlationId);
  }

  /**
   * Clears all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.emit('logs:cleared');
  }

  /**
   * Starts fetching logs or connecting to the stream.
   */
  start(): void {
    if (this.options.apiUrl) {
      this.connectToStream();
    } else {
      // Fallback or alternative log fetching method if needed
      this.logger.warn('No API URL configured for log streaming.');
    }

    // Consider auto-refresh logic if apiUrl is not used
    // this.startAutoRefresh();
  }

  /**
   * Stops fetching logs or disconnects from the stream.
   */
  stop(): void {
    this.disconnectFromStream();
    // this.stopAutoRefresh();
  }

  /**
   * Connects to the SSE stream for logs.
   * @private
   */
  private connectToStream(): void {
    if (this.logSource || !this.options.apiUrl) return;

    this.logger.info(`Connecting to log stream: ${this.options.apiUrl}`);
    this.logSource = new EventSource(this.options.apiUrl);

    this.logSource.onopen = () => {
      this.logger.info('Log stream connected.');
      this.currentReconnectAttempts = 0;
      this.emit('logs:connected');
    };

    this.logSource.onmessage = event => {
      try {
        const logEntry = JSON.parse(event.data);
        this.logs.push(logEntry);
        // Optional: Limit log buffer size
        if (this.logs.length > (this.options.maxLogEntries || 1000)) {
          this.logs.shift();
        }
        this.emit('logs:new', logEntry);
      } catch (error) {
        this.logger.error('Failed to parse log entry:', error, event.data);
      }
    };

    this.logSource.onerror = error => {
      this.logger.error('Log stream error:', error);
      this.emit('logs:error', { error });
      this.handleStreamDisconnect();
    };
  }

  /**
   * Handles stream disconnection and attempts reconnection.
   * @private
   */
  private handleStreamDisconnect(): void {
    this.logger.warn('Log stream disconnected. Attempting reconnect...');
    if (this.logSource) {
      this.logSource.close();
      this.logSource = null;
    }

    if (this.currentReconnectAttempts < this.maxReconnectAttempts) {
      this.currentReconnectAttempts++;
      setTimeout(
        () => {
          this.logger.info(
            `Reconnect attempt ${this.currentReconnectAttempts}/${this.maxReconnectAttempts}...`,
          );
          this.connectToStream();
        },
        this.reconnectInterval * Math.pow(2, this.currentReconnectAttempts - 1),
      ); // Exponential backoff
    } else {
      this.logger.error('Max reconnect attempts reached. Stopping reconnection attempts.');
      this.emit('logs:disconnected');
    }
  }

  /**
   * Disconnects from the SSE stream.
   * @private
   */
  private disconnectFromStream(): void {
    if (this.logSource) {
      this.logger.info('Disconnecting from log stream.');
      this.logSource.close();
      this.logSource = null;
      this.emit('logs:disconnected');
      this.currentReconnectAttempts = 0; // Reset attempts on manual disconnect
    }
  }

  // ... rest of the class ...
}
