/**
 * Domain Event Manager
 * 
 * Handles domain events from the backend API and provides formatting
 * and filtering capabilities.
 */

import { logger } from '../utils/logger';

export interface DomainEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
  source?: string;
  correlationId?: string;
}

export interface DomainEventManagerOptions {
  onEventReceived?: (event: DomainEvent) => void;
}

export class DomainEventManager {
  private events: DomainEvent[] = [];
  private options: DomainEventManagerOptions;
  private eventListeners: Map<string, Function[]> = new Map();
  
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: DomainEventManagerOptions = {}) {
    this.options = options;
  }
  
  /**
   * Initialize the manager
   */
  initialize(): void {
    logger.info('Domain Event Manager initialized');
  }
  
  /**
   * Check if a log entry is a domain event
   * @param log Log entry to check
   * @returns True if log is a domain event
   */
  isDomainEventLog(log: any): boolean {
    return log && 
           typeof log === 'object' && 
           log.type && 
           log.timestamp && 
           log.payload;
  }
  
  /**
   * Add a domain event
   * @param event Domain event to add
   */
  addEvent(event: DomainEvent): void {
    this.events.push(event);
    
    // Notify listeners
    if (this.options.onEventReceived) {
      this.options.onEventReceived(event);
    }
    
    // Emit event
    this.emit('eventAdded', event);
    this.emit(event.type, event);
    
    logger.debug('Domain event received:', event);
  }
  
  /**
   * Get all domain events
   * @returns Array of domain events
   */
  getEvents(): DomainEvent[] {
    return this.events;
  }
  
  /**
   * Get events by type
   * @param type Event type
   * @returns Events matching the type
   */
  getEventsByType(type: string): DomainEvent[] {
    return this.events.filter(event => event.type === type);
  }
  
  /**
   * Get events by source
   * @param source Event source
   * @returns Events matching the source
   */
  getEventsBySource(source: string): DomainEvent[] {
    return this.events.filter(event => event.source === source);
  }
  
  /**
   * Get events by correlation ID
   * @param correlationId Correlation ID
   * @returns Events matching the correlation ID
   */
  getEventsByCorrelationId(correlationId: string): DomainEvent[] {
    return this.events.filter(event => event.correlationId === correlationId);
  }
  
  /**
   * Clear all domain events
   */
  clearEvents(): void {
    this.events = [];
    this.emit('eventsCleared');
    logger.debug('Domain events cleared');
  }
  
  /**
   * Format domain event details for display
   * @param event Domain event to format
   * @returns Formatted HTML string
   */
  formatDomainEventDetails(event: DomainEvent): string {
    if (!event) return '<div class="text-text-muted">No event data</div>';
    
    const timestamp = new Date(event.timestamp).toLocaleString();
    
    let html = `
      <div class="domain-event p-3 border border-border rounded mb-2">
        <div class="flex justify-between items-start">
          <div class="font-bold">${event.type}</div>
          <div class="text-xs text-text-muted">${timestamp}</div>
        </div>
    `;
    
    // Add source if available
    if (event.source) {
      html += `<div class="text-sm text-text-muted mb-2">Source: ${event.source}</div>`;
    }
    
    // Add correlation ID if available
    if (event.correlationId) {
      html += `<div class="text-sm text-text-muted mb-2">Correlation ID: ${event.correlationId}</div>`;
    }
    
    // Format payload
    html += `
      <div class="mt-2">
        <div class="text-sm font-bold mb-1">Payload:</div>
        <div class="bg-bg-code p-2 rounded overflow-x-auto text-sm">
          <pre>${JSON.stringify(event.payload, null, 2)}</pre>
        </div>
      </div>
    `;
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Handle a batch of logs from the backend
   * @param logs Array of log entries
   */
  handleBackendLogs(logs: any[]): void {
    if (!Array.isArray(logs)) return;
    
    logs.forEach(log => {
      if (this.isDomainEventLog(log)) {
        this.addEvent(log as DomainEvent);
      }
    });
  }
  
  /**
   * Add an event listener
   * @param event Event name
   * @param callback Callback function
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)?.push(callback);
  }
  
  /**
   * Remove an event listener
   * @param event Event name
   * @param callback Callback function
   */
  off(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    const callbacks = this.eventListeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
  
  /**
   * Emit an event
   * @param event Event name
   * @param data Event data
   */
  private emit(event: string, data?: any): void {
    if (!this.eventListeners.has(event)) return;
    
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error in domain event listener for ${event}:`, error);
      }
    });
  }
} 