// Types improved by ts-improve-types
/**
 * History Manager
 * Manages request and response history
 */

import { HistoryManagerOptions } from '../types/ui';
import { StorageService, LocalStorageService, SessionStorageService, MemoryStorageService } from '../services/StorageService';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  url: string;
  status: number;
  success: boolean;
  duration: number;
  request: {
    headers: Record<string, string>;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  response: {
    headers: Record<string, string>;
    data: unknown[] | Record<string, unknown>;
    size: number;
  };
}

/**
 * HistoryManager class
 * Manages request/response history for the API tester
 */
export class HistoryManager {
  private history: HistoryEntry[] = [];
  private options: HistoryManagerOptions;
  private storageService: StorageService;
  private eventBus: EventBus;
  private logger = Logger.getLogger('HistoryManager');

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: HistoryManagerOptions = {}) {
    this.options = {
      maxEntries: 50,
      persistHistory: true,
      storageKey: 'api_tester_history',
      storageType: 'localStorage',
      compressionEnabled: true,
      compressionThreshold: 100000, // 100KB
      storageQuotaWarningThreshold: 0.8, // 80% of available storage
      ...options,
    };

    // Initialize event bus
    this.eventBus = options.eventBus || EventBus.getInstance();
    
    // Initialize the appropriate storage service based on options
    if (options.storageService) {
      this.storageService = options.storageService;
    } else {
      switch(this.options.storageType) {
        case 'sessionStorage':
          this.storageService = new SessionStorageService();
          break;
        case 'memory':
          this.storageService = new MemoryStorageService();
          break;
        case 'localStorage':
        default:
          this.storageService = new LocalStorageService();
          break;
      }
    }

    this.loadHistory();
  }

  /**
   * Load history from storage
   */
  private loadHistory(): void {
    try {
      const storageKey = this.options.storageKey || 'api_tester_history';
      const storedHistory = this.storageService.get<string | HistoryEntry[]>(storageKey);
      
      if (storedHistory) {
        if (typeof storedHistory === 'string') {
          if (storedHistory.startsWith('COMPRESSED:')) {
            // Handle decompression (placeholder)
            this.history = JSON.parse(storedHistory.substring(11));
          } else {
            this.history = JSON.parse(storedHistory);
          }
        } else if (Array.isArray(storedHistory)) {
          // If directly retrieved as array, use it
          this.history = storedHistory;
        }

        // Publish event for history loaded
        this.eventBus.publish('history:loaded', { history: this.history });
      }
    } catch (error) {
      this.logger.error('Failed to load history:', error);
      this.history = [];
    }
  }

  /**
   * Save history to storage
   */
  private saveHistory(): void {
    if (!this.options.persistHistory) return;

    try {
      const storageKey = this.options.storageKey || 'api_tester_history';
      this.storageService.set(storageKey, this.history);
    } catch (error) {
      this.logger.error('Failed to save history:', error);
      
      // If storage fails, switch to memory-only
      this.options.storageType = 'memory';
      this.storageService = new MemoryStorageService();
    }
  }

  /**
   * Add a new entry to the history
   * @param requestInfo Request information
   * @param responseData Response data
   */
  addEntry(requestInfo: unknown, responseData: unknown): void {
    // Create an entry with sanitized data
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      // Access properties safely after type check/assertion
      method:
        typeof requestInfo === 'object' && requestInfo !== null && 'method' in requestInfo
          ? String(requestInfo.method)
          : 'GET',
      path:
        typeof requestInfo === 'object' && requestInfo !== null && 'url' in requestInfo
          ? this.extractPathFromUrl(String(requestInfo.url))
          : '',
      url:
        typeof requestInfo === 'object' && requestInfo !== null && 'url' in requestInfo
          ? String(requestInfo.url)
          : '',
      status:
        typeof responseData === 'object' && responseData !== null && 'status' in responseData
          ? Number(responseData.status)
          : 0,
      success:
        typeof responseData === 'object' &&
        responseData !== null &&
        'status' in responseData &&
        Number(responseData.status) >= 200 &&
        Number(responseData.status) < 300,
      duration:
        typeof responseData === 'object' && responseData !== null && 'duration' in responseData
          ? Number(responseData.duration)
          : 0,
      request: {
        headers:
          typeof requestInfo === 'object' && requestInfo !== null && 'headers' in requestInfo
            ? this.sanitizeHeaders(requestInfo.headers as Record<string, string>)
            : {},
        params:
          typeof requestInfo === 'object' && requestInfo !== null && 'params' in requestInfo
            ? (requestInfo.params as Record<string, string>)
            : undefined,
        body:
          typeof requestInfo === 'object' && requestInfo !== null && 'body' in requestInfo
            ? (requestInfo.body as Record<string, unknown>)
            : undefined,
      },
      response: {
        headers:
          typeof responseData === 'object' && responseData !== null && 'headers' in responseData
            ? this.sanitizeHeaders(responseData.headers as Record<string, string>)
            : {},
        // Ensure data is array or object before assigning/calculating size
        data:
          typeof responseData === 'object' &&
          responseData !== null &&
          'data' in responseData &&
          (Array.isArray(responseData.data) || typeof responseData.data === 'object')
            ? (responseData.data as unknown[] | Record<string, unknown>)
            : {},
        size:
          typeof responseData === 'object' &&
          responseData !== null &&
          'data' in responseData &&
          (Array.isArray(responseData.data) || typeof responseData.data === 'object')
            ? this.calculateSize(responseData.data as unknown[] | Record<string, unknown>)
            : 0,
      },
    };

    // Add to history
    this.history.unshift(entry);

    // Trim history if needed
    const maxEntries = this.options.maxEntries || 50;
    if (this.history.length > maxEntries) {
      this.history = this.history.slice(0, maxEntries);
    }

    // Save to storage
    this.saveHistory();

    // Publish event
    this.eventBus.publish('history:changed', { history: this.history });
  }

  /**
   * Get all history entries
   * @returns Array of history entries
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get a history entry by ID
   * @param id Entry ID
   * @returns History entry or null if not found
   */
  getEntryById(id: string): HistoryEntry | null {
    return this.history.find(entry => entry.id === id) || null;
  }

  /**
   * Delete a history entry
   * @param id Entry ID
   * @returns Whether the entry was deleted
   */
  deleteEntry(id: string): boolean {
    const initialLength = this.history.length;
    this.history = this.history.filter(entry => entry.id !== id);

    // Check if anything was deleted
    if (this.history.length !== initialLength) {
      // Save to storage
      this.saveHistory();

      // Publish event
      this.eventBus.publish('history:changed', { history: this.history });

      return true;
    }

    return false;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];

    // Save to storage
    this.saveHistory();

    // Publish events
    this.eventBus.publish('history:cleared', null);
    this.eventBus.publish('history:changed', { history: this.history });
  }

  /**
   * Extract path from URL
   * @param url URL to extract path from
   * @returns URL path
   */
  private extractPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (error) {
      // If URL parsing fails, return the URL as is
      return url;
    }
  }

  /**
   * Sanitize headers
   * @param headers Headers object
   * @returns Sanitized headers object
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // Convert header names to lowercase
    Object.keys(headers).forEach(key => {
      sanitized[key.toLowerCase()] = headers[key];
    });

    return sanitized;
  }

  /**
   * Generate a unique ID
   * @returns Unique ID
   */
  private generateId(): string {
    return 'h_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Calculate size of data in bytes
   * @param data Data to calculate size of
   * @returns Size in bytes
   */
  private calculateSize(data: unknown[] | Record<string, unknown>): number {
    if (!data) return 0;

    try {
      // Quick estimate using JSON
      return JSON.stringify(data).length;
    } catch (error) {
      // If JSON fails, return 0
      return 0;
    }
  }
}
