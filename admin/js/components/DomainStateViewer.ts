/**
 * DomainStateViewer Component
 * Displays and visualizes domain state
 */

import { logger } from '../utils/logger';

/**
 * Interface for DomainStateViewer options
 */
export interface DomainStateViewerOptions {
  containerId: string;
}

/**
 * DomainStateViewer class
 */
export class DomainStateViewer {
  private options: DomainStateViewerOptions;
  private container: HTMLElement | null = null;
  private currentState: Record<string, any> = {};
  private jsonFormatter: any = null; // Will use JSON Formatter library if available
  
  /**
   * Creates a new DomainStateViewer instance
   * @param options Viewer options
   */
  constructor(options: DomainStateViewerOptions) {
    this.options = options;
  }
  
  /**
   * Initializes the viewer
   */
  public initialize(): void {
    try {
      // Get container element
      this.container = document.getElementById(this.options.containerId);
      
      if (!this.container) {
        throw new Error(`Container element not found: ${this.options.containerId}`);
      }
      
      // Check if JSON Formatter is available
      if (typeof window !== 'undefined' && 'JSONFormatter' in window) {
        this.jsonFormatter = (window as any).JSONFormatter;
      }
      
      logger.debug('DomainStateViewer: Initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateViewer: Initialization failed:', errorMessage);
    }
  }
  
  /**
   * Updates the viewer with new state data
   * @param state Current state object
   * @param diff Optional diff showing state changes
   */
  public updateState(state: Record<string, any>, diff?: Record<string, any> | null): void {
    try {
      if (!this.container) {
        return;
      }
      
      this.currentState = { ...state };
      
      // Display state
      if (Object.keys(state).length === 0) {
        this.renderEmptyState();
      } else {
        this.renderState(state, diff);
      }
      
      logger.debug('DomainStateViewer: State updated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateViewer: Failed to update state:', errorMessage);
    }
  }
  
  /**
   * Renders empty state message
   */
  private renderEmptyState(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="empty-state">
        <p class="text-text-muted">No domain state data available</p>
      </div>
    `;
  }
  
  /**
   * Renders state content
   * @param state State object to render
   * @param diff Optional diff showing state changes
   */
  private renderState(state: Record<string, any>, diff?: Record<string, any> | null): void {
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create state wrapper
    const stateWrapper = document.createElement('div');
    stateWrapper.className = 'domain-state-wrapper';
    
    // Add toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'domain-state-toolbar';
    toolbar.innerHTML = `
      <div class="state-info">
        <span class="state-count">${Object.keys(state).length} entities</span>
      </div>
      <div class="toolbar-actions">
        <button class="refresh-state-btn" title="Refresh State">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
        <button class="expand-all-btn" title="Expand All">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7"></path>
          </svg>
        </button>
        <button class="collapse-all-btn" title="Collapse All">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
    `;
    stateWrapper.appendChild(toolbar);
    
    // Add diff summary if available
    if (diff && (
        Object.keys(diff.added).length > 0 || 
        Object.keys(diff.updated).length > 0 || 
        Object.keys(diff.removed).length > 0
    )) {
      const diffSummary = document.createElement('div');
      diffSummary.className = 'state-diff-summary';
      
      let summaryHTML = '<div class="diff-title">Changes:</div><div class="diff-counts">';
      
      if (Object.keys(diff.added).length > 0) {
        summaryHTML += `<span class="diff-added">+${Object.keys(diff.added).length} added</span>`;
      }
      
      if (Object.keys(diff.updated).length > 0) {
        summaryHTML += `<span class="diff-updated">~${Object.keys(diff.updated).length} updated</span>`;
      }
      
      if (Object.keys(diff.removed).length > 0) {
        summaryHTML += `<span class="diff-removed">-${Object.keys(diff.removed).length} removed</span>`;
      }
      
      summaryHTML += '</div>';
      diffSummary.innerHTML = summaryHTML;
      stateWrapper.appendChild(diffSummary);
    }
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'domain-state-content';
    
    // Use JSON Formatter if available, otherwise use preformatted text
    if (this.jsonFormatter) {
      const formatter = new this.jsonFormatter(state);
      contentContainer.appendChild(formatter.render());
      
      // Add diff highlights if available
      if (diff) {
        this.addDiffHighlights(contentContainer, diff);
      }
    } else {
      // Simple JSON display with syntax highlighting
      const pre = document.createElement('pre');
      pre.className = 'json-display';
      pre.textContent = JSON.stringify(state, null, 2);
      contentContainer.appendChild(pre);
    }
    
    stateWrapper.appendChild(contentContainer);
    this.container.appendChild(stateWrapper);
    
    // Add event listeners
    this.addEventListeners(stateWrapper);
  }
  
  /**
   * Adds diff highlights to the rendered JSON
   * @param container Container element
   * @param diff State diff object
   */
  private addDiffHighlights(container: HTMLElement, diff: Record<string, any>): void {
    // This is a simple implementation - for a real app, you would need
    // to walk the DOM and find the specific nodes to highlight based on paths
    
    // Get all key elements
    const keyElements = container.querySelectorAll('.json-formatter-key');
    
    keyElements.forEach(keyElement => {
      const key = keyElement.textContent?.replace(':', '').trim();
      
      if (!key) return;
      
      // Check if this key is in any of the diff categories
      if (key in diff.added) {
        keyElement.parentElement?.classList.add('diff-added');
      } else if (key in diff.updated) {
        keyElement.parentElement?.classList.add('diff-updated');
      } else if (key in diff.removed) {
        // Removed keys won't be in the current state, so we'd need to
        // add them separately - this is beyond the scope of this example
      }
    });
  }
  
  /**
   * Adds event listeners to the state viewer
   * @param container Container element
   */
  private addEventListeners(container: HTMLElement): void {
    // Refresh button
    const refreshBtn = container.querySelector('.refresh-state-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Dispatch a custom event that can be handled by the app
        const event = new CustomEvent('domainstate:refresh');
        document.dispatchEvent(event);
      });
    }
    
    // Expand all button
    const expandBtn = container.querySelector('.expand-all-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        // If using JSONFormatter, find all toggle elements and expand them
        const toggles = container.querySelectorAll('.json-formatter-toggler-link');
        toggles.forEach(toggle => {
          const open = toggle.parentElement?.classList.contains('json-formatter-open');
          if (!open) {
            (toggle as HTMLElement).click();
          }
        });
      });
    }
    
    // Collapse all button
    const collapseBtn = container.querySelector('.collapse-all-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        // If using JSONFormatter, find all toggle elements and collapse them
        const toggles = container.querySelectorAll('.json-formatter-toggler-link');
        toggles.forEach(toggle => {
          const open = toggle.parentElement?.classList.contains('json-formatter-open');
          if (open) {
            (toggle as HTMLElement).click();
          }
        });
      });
    }
  }
} 