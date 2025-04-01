/**
 * History Manager
 * Manages request and response history
 */

import { HistoryManagerOptions } from '../types/modules';

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
    body?: any;
  };
  response: {
    headers: Record<string, string>;
    data: any;
    size: number;
  };
}

/**
 * HistoryManager class
 * Manages request/response history for the API tester
 */
export class HistoryManager extends EventTarget {
  private history: HistoryEntry[] = [];
  private options: HistoryManagerOptions;
  
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: HistoryManagerOptions = {}) {
    super();
    
        this.options = {
            maxEntries: 50,
      persistHistory: true,
      storageKey: 'api_tester_history',
      storageType: 'localStorage',
            compressionEnabled: true,
      compressionThreshold: 100000, // 100KB
      storageQuotaWarningThreshold: 0.8, // 80% of available storage
            ...options
        };
        
        this.loadHistory();
    }
    
    /**
   * Load history from storage
   */
  private loadHistory(): void {
    try {
      if (this.options.storageType === 'localStorage') {
        const storageKey = this.options.storageKey || 'api_tester_history';
        const storedHistory = localStorage.getItem(storageKey);
        
        if (storedHistory) {
          if (storedHistory.startsWith('COMPRESSED:')) {
            // Handle decompression (placeholder)
            this.history = JSON.parse(storedHistory.substring(11));
          } else {
            this.history = JSON.parse(storedHistory);
          }
          
          // Fire event
          this.dispatchEvent(new CustomEvent('history:loaded', {
            detail: { history: this.history }
          }));
        }
      } else if (this.options.storageType === 'sessionStorage') {
        const storageKey = this.options.storageKey || 'api_tester_history';
        const storedHistory = sessionStorage.getItem(storageKey);
        
        if (storedHistory) {
          if (storedHistory.startsWith('COMPRESSED:')) {
            // Handle decompression (placeholder)
            this.history = JSON.parse(storedHistory.substring(11));
          } else {
            this.history = JSON.parse(storedHistory);
          }
          
          // Fire event
          this.dispatchEvent(new CustomEvent('history:loaded', {
            detail: { history: this.history }
          }));
                }
            }
        } catch (error) {
      console.error('Failed to load history:', error);
            this.history = [];
        }
    }
    
    /**
   * Save history to storage
   */
  private saveHistory(): void {
    if (!this.options.persistHistory) return;
    
    try {
      // Simple implementation without compression for now
      const historyStr = JSON.stringify(this.history);
      const storageKey = this.options.storageKey || 'api_tester_history';
      
      if (this.options.storageType === 'localStorage') {
        localStorage.setItem(storageKey, historyStr);
      } else if (this.options.storageType === 'sessionStorage') {
        sessionStorage.setItem(storageKey, historyStr);
            }
        } catch (error) {
      console.error('Failed to save history:', error);
      // If storage fails, switch to memory-only
      this.options.storageType = 'memory';
        }
    }
    
    /**
   * Add a new entry to the history
   * @param requestInfo Request information
   * @param responseData Response data
   */
  addEntry(requestInfo: any, responseData: any): void {
    // Create an entry with sanitized data
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      method: requestInfo.method || 'GET',
      path: this.extractPathFromUrl(requestInfo.url),
            url: requestInfo.url,
      status: responseData.status || 0,
      success: responseData.status >= 200 && responseData.status < 300,
      duration: responseData.duration || 0,
      request: {
        headers: this.sanitizeHeaders(requestInfo.headers || {}),
        params: requestInfo.params,
        body: requestInfo.body
      },
      response: {
        headers: this.sanitizeHeaders(responseData.headers || {}),
        data: responseData.data,
        size: this.calculateSize(responseData.data)
      }
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
        
    // Fire event
    this.dispatchEvent(new CustomEvent('history:changed', {
      detail: { history: this.history }
    }));
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
            
      // Fire event
      this.dispatchEvent(new CustomEvent('history:changed', {
        detail: { history: this.history }
      }));
            
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
        
    // Fire events
    this.dispatchEvent(new CustomEvent('history:cleared'));
    this.dispatchEvent(new CustomEvent('history:changed', {
      detail: { history: this.history }
    }));
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
  private calculateSize(data: any): number {
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