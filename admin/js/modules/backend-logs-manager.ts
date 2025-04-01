/**
 * Backend Logs Manager Module
 * Handles fetching and managing logs from the backend
 */
import { logger } from '../utils/logger';

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    correlationId?: string;
    context?: Record<string, any>;
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
export class BackendLogsManager {
    private options: Required<BackendLogsManagerOptions>;
    private apiClient: any | null;
    private logs: LogEntry[];
    private isLoadingLogs: boolean;
    private lastError: Error | null;
    private eventListeners: Map<string, Function[]>;
    private refreshIntervalId: number | null;
    
    /**
     * Creates a new BackendLogsManager instance
     * @param options - Configuration options
     */
    constructor(options: Partial<BackendLogsManagerOptions> = {}) {
        this.options = {
            apiClient: null,
            logsEndpoint: "/api/v1/system/logs",
            maxLogsToFetch: 500,
            refreshInterval: null, // If set, auto-refresh logs at this interval (ms)
            autoRefresh: false,
            maxLogEntries: 500,
            fetchInterval: 0,
            ...options
        };
        
        this.apiClient = this.options.apiClient;
        this.logs = [];
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
     * Emits an event to all registered listeners
     * @param event - The event name
     * @param data - The event data
     */
    private emit(event: string, data: any = null): void {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        logger.error(`Error in backend logs event listener for ${event}:`, error);
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
    async fetchLogs(options: FetchLogsOptions = {}): Promise<LogEntry[]> {
        const fetchOptions: FetchLogsOptions = {
            correlationId: options.correlationId || undefined,
            level: options.level || undefined,
            limit: options.limit || this.options.maxLogsToFetch,
            search: options.search || undefined,
            ...options
        };
        
        this.isLoadingLogs = true;
        this.emit("logs:loading", { options: fetchOptions });
        
        try {
            // Build the URL with query parameters
            const url = new URL(this.options.logsEndpoint, window.location.origin);
            if (fetchOptions.correlationId) url.searchParams.append("correlationId", fetchOptions.correlationId);
            if (fetchOptions.level) url.searchParams.append("level", fetchOptions.level);
            if (fetchOptions.limit) url.searchParams.append("limit", String(fetchOptions.limit));
            if (fetchOptions.search) url.searchParams.append("search", fetchOptions.search);
            
            // Fetch the logs
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json() as LogsResponse;
            
            if (!data.status || data.status !== "success" || !data.data || !Array.isArray(data.data.logs)) {
                throw new Error("Invalid response format");
            }
            
            // Store logs
            this.logs = data.data.logs;
            this.lastError = null;
            
            // Emit loaded event
            this.emit("logs:loaded", {
                logs: this.logs,
                count: this.logs.length,
                source: options.source || "manual",
                logFile: data.data.logFile
            });
            
            // Also emit logsReceived for compatibility
            this.emit("logsReceived", this.logs);
            
            return this.logs;
        } catch (error) {
            this.lastError = error instanceof Error ? error : new Error(String(error));
            
            // Emit error event
            this.emit("logs:error", {
                error: this.lastError,
                message: this.lastError.message
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
        this.emit("logs:refreshing", options);
        
        try {
            return await this.fetchLogs({
                ...options,
                source: "refresh"
            });
        } catch (error) {
            // Error is already emitted in fetchLogs
            throw error;
        }
    }
    
    /**
     * Starts auto-refreshing logs at the specified interval
     * @param interval - Refresh interval in ms
     */
    startAutoRefresh(interval?: number): void {
        // Clear existing interval if any
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
        }
        
        // Set new interval
        const refreshInterval = interval || this.options.refreshInterval;
        if (refreshInterval) {
            this.refreshIntervalId = window.setInterval(() => {
                this.refreshLogs({ source: "auto" }).catch(error => {
                    console.error("Auto-refresh logs error:", error);
                });
            }, refreshInterval);
            
            this.emit("logs:autoRefreshStarted", { interval: refreshInterval });
        }
    }
    
    /**
     * Stops auto-refreshing logs
     */
    stopAutoRefresh(): void {
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
            
            this.emit("logs:autoRefreshStopped");
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
                const contextMatch = log.context && JSON.stringify(log.context).toLowerCase().includes(searchText);
                
                if (!messageMatch && !contextMatch) {
                    return false;
                }
            }
            
            // Filter by time range
            if (filters.startTime) {
                const startTime = typeof filters.startTime === 'string' 
                    ? new Date(filters.startTime) 
                    : filters.startTime;
                
                const logTime = new Date(log.timestamp);
                if (logTime < startTime) {
                    return false;
                }
            }
            
            if (filters.endTime) {
                const endTime = typeof filters.endTime === 'string' 
                    ? new Date(filters.endTime) 
                    : filters.endTime;
                
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
        this.emit("logs:cleared");
    }
} 