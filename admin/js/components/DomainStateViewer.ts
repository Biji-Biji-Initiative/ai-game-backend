// Types improved by ts-improve-types
/**
 * Domain State Viewer Component
 *
 * Provides UI for selecting entity types and viewing domain state snapshots and differences.
 */

import { ComponentLogger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { DomainStateManager } from '../modules/domain-state-manager';

interface DomainStateViewerOptions {
  container: HTMLElement | null;
  domainStateManager: DomainStateManager;
  // Callback to get the current request object needed for snapshots
  getCurrentRequest: () => { path?: string; body?: unknown } | null;
  eventBus: EventBus;
  logger: ComponentLogger;
}

interface TabContentElements {
  [key: string]: HTMLElement | null;
}

/**
 * UI Component to visualize domain state snapshots and diffs.
 */
export class DomainStateViewer {
  private options: DomainStateViewerOptions;
  private container: HTMLElement;
  private domainStateManager: DomainStateManager;
  private eventBus: EventBus;
  private logger: ComponentLogger;
  private entityTypesListElement: HTMLElement | null = null;
  private takeBeforeSnapshotButton: HTMLButtonElement | null = null;
  private takeAfterSnapshotButton: HTMLButtonElement | null = null;
  private snapshotStatusElement: HTMLElement | null = null;
  private beforeSnapshotDataElement: HTMLElement | null = null;
  private afterSnapshotDataElement: HTMLElement | null = null;
  private diffDataElement: HTMLElement | null = null;
  private tabButtons: NodeListOf<HTMLButtonElement> | null = null;
  private contentPanels: TabContentElements = {};
  private selectedEntityTypeIds: string[] = [];

  /**
   * Constructor
   * @param options Component options
   */
  constructor(options: DomainStateViewerOptions) {
    // @ts-ignore - Complex type issues
    if (!options.container) {
      throw new Error('Container element is required for DomainStateViewer');
    }
    if (!options.domainStateManager) {
      throw new Error('DomainStateManager is required for DomainStateViewer');
    }
    if (typeof options.getCurrentRequest !== 'function') {
      throw new Error('getCurrentRequest function is required for DomainStateViewer');
    }
    if (!options.eventBus) {
      throw new Error('EventBus is required for DomainStateViewer');
    }
    if (!options.logger) {
      throw new Error('Logger is required for DomainStateViewer');
    }

    this.options = {
      ...options,
    };

    this.domainStateManager = this.options.domainStateManager;
    this.eventBus = this.options.eventBus;
    this.logger = this.options.logger;

    // Use container from options directly
    if (options.container instanceof HTMLElement) {
      this.container = options.container;
    } else if (typeof options.container === 'string') {
      // If it's a string, treat it as an ID
      const containerElement = document.getElementById(options.container);
      if (!containerElement) {
        throw new Error(`Container element with ID "${options.container}" not found`);
      }
      this.container = containerElement;
    } else {
      throw new Error('Container must be an HTMLElement or a string ID');
    }

    // Find elements (assuming they exist in the container)
    this.entityTypesListElement = this.container.querySelector('.entity-types-list') as HTMLElement;
    this.takeBeforeSnapshotButton = this.container.querySelector(
      '.take-before-snapshot',
    ) as HTMLButtonElement;
    this.takeAfterSnapshotButton = this.container.querySelector(
      '.take-after-snapshot',
    ) as HTMLButtonElement;
    this.snapshotStatusElement = this.container.querySelector('.snapshot-status') as HTMLElement;
    this.beforeSnapshotDataElement = this.container.querySelector(
      '.before-snapshot-data',
    ) as HTMLElement;
    this.afterSnapshotDataElement = this.container.querySelector(
      '.after-snapshot-data',
    ) as HTMLElement;
    this.diffDataElement = this.container.querySelector('.diff-data') as HTMLElement;
    this.tabButtons = this.container.querySelectorAll('.tab-button');
    this.contentPanels = {}; // Initialize empty
    this.container.querySelectorAll('.content-panel').forEach(panel => {
      if (panel instanceof HTMLElement && panel.dataset.tab) {
        this.contentPanels[panel.dataset.tab] = panel;
      }
    });

    this.initializeUI();
    this.logger.debug('DomainStateViewer initialized');
  }

  /**
   * Initializes the UI elements and event listeners.
   * @private
   */
  private initializeUI(): void {
    this.container.innerHTML = `
      <div class="domain-state-viewer">
        <div class="domain-state-header">
          <h3>Domain State Snapshot</h3>
          <p class="domain-state-description">
            Select entity types to capture state snapshots before and after executing the step.
          </p>
        </div>
        
        <div class="domain-state-selector">
          <label class="selector-label">Select Entity Types:</label>
          <div class="entity-types-list" id="entity-types-list">
            <!-- Entity type checkboxes will be added here -->
            <div class="loading-placeholder">Loading entity types...</div>
          </div>
          
          <div class="snapshot-actions">
            <button type="button" id="take-before-snapshot-btn" class="btn btn-secondary btn-sm" disabled>
              Take Before Snapshot
            </button>
            <button type="button" id="take-after-snapshot-btn" class="btn btn-secondary btn-sm" disabled>
              Take After Snapshot
            </button>
            <div class="snapshot-status" id="snapshot-status"></div>
          </div>
        </div>
        
        <div class="domain-state-content-container">
          <div class="domain-state-tabs">
            <button type="button" class="domain-state-tab active" data-tab="snapshot-view">Snapshots</button>
            <button type="button" class="domain-state-tab" data-tab="diff-view">Differences</button>
          </div>
          
          <div class="domain-state-content active" id="snapshot-view">
            <div class="snapshot-panels">
              <div class="snapshot-panel">
                <h4>Before State</h4>
                <div class="snapshot-data" id="before-snapshot-data">
                  <div class="empty-snapshot">No snapshot taken yet. Select entities and click 'Take Before Snapshot'.</div>
                </div>
              </div>
              
              <div class="snapshot-panel">
                <h4>After State</h4>
                <div class="snapshot-data" id="after-snapshot-data">
                  <div class="empty-snapshot">Run the step after taking the 'Before' snapshot.</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="domain-state-content" id="diff-view">
            <div class="diff-data" id="diff-data">
              <div class="empty-diff">No differences to display. Take snapshots before and after running the step.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Populate entity types
    this.populateEntityTypes();

    // Add event listeners
    this.takeBeforeSnapshotButton?.addEventListener('click', () => this.handleTakeBeforeSnapshot());
    this.takeAfterSnapshotButton?.addEventListener('click', () => this.handleTakeAfterSnapshot());

    this.tabButtons?.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
          this.setActiveTab(tabName);
        }
      });
    });

    // Listen to domain state manager events using EventBus
    this.eventBus.subscribe(
      'snapshotChange',
      (data: { phase: 'before' | 'after'; snapshots: Record<string, unknown> }) => {
        this.renderSnapshots(data.phase, data.snapshots);
        if (data.phase === 'after') {
          this.renderDiff();
          // Optionally switch to diff view automatically
          // this.setActiveTab('diff-view');
        }
      },
    );

    this.eventBus.subscribe('error', (errorData: { message: string; error?: unknown }) => {
      this.showStatus(errorData.message, 'error');
    });
  }

  /**
   * Populates the list of entity types with checkboxes.
   * @private
   */
  private populateEntityTypes(): void {
    if (!this.entityTypesListElement) return;

    const entityTypes = this.domainStateManager.getEntityTypes();

    if (entityTypes.length === 0) {
      this.entityTypesListElement.innerHTML =
        '<p class="text-muted">No entity types available for snapshotting.</p>';
      return;
    }

    const html = entityTypes
      .map(
        type => `
      <div class="entity-type-item">
        <label class="entity-type-checkbox">
          <input type="checkbox" name="entity-type" value="${type.id}">
          <span>${type.name}</span>
        </label>
      </div>
    `,
      )
      .join('');

    this.entityTypesListElement.innerHTML = html;

    // Add event listeners to checkboxes
    this.entityTypesListElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateSelectedEntityTypes());
    });
  }

  /**
   * Updates the internal list of selected entity types based on checkbox states.
   * @private
   */
  private updateSelectedEntityTypes(): void {
    this.selectedEntityTypeIds = []; // Property added
    this.entityTypesListElement
      ?.querySelectorAll('input[type="checkbox"]:checked')
      .forEach(checkbox => {
        if (checkbox instanceof HTMLInputElement) {
          this.selectedEntityTypeIds.push(checkbox.value);
        }
      });

    // Enable/disable the snapshot button
    if (this.takeBeforeSnapshotButton) {
      this.takeBeforeSnapshotButton.disabled = this.selectedEntityTypeIds.length === 0;
    }
    if (this.takeAfterSnapshotButton) {
      this.takeAfterSnapshotButton.disabled = this.selectedEntityTypeIds.length === 0;
    }
    this.logger.debug('Selected entity types updated', { selected: this.selectedEntityTypeIds });
  }

  /**
   * Handles the click event for the 'Take Before Snapshot' button.
   * @private
   */
  private async handleTakeBeforeSnapshot(): Promise<void> {
    if (this.selectedEntityTypeIds.length === 0) {
      this.showStatus('Please select at least one entity type', 'warning');
      return;
    }

    // Retrieve current request from options
    const request = this.options.getCurrentRequest?.();
    if (!request) {
      this.showStatus('Cannot take snapshot: No current request data available.', 'error');
      this.logger.warn('Attempted to take snapshot, but getCurrentRequest returned null.');
      return;
    }

    try {
      this.showStatus('Taking snapshot...', 'info');
      await this.domainStateManager.takeBeforeSnapshot(request, this.selectedEntityTypeIds);
      this.showStatus('Before snapshot taken successfully. You can now run the step.', 'success');
    } catch (error) {
      this.logger.error('Failed to take before snapshot:', error);
      // Error is likely already emitted by DomainStateManager, but show status just in case
      this.showStatus(
        `Failed to take snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      );
    }
  }

  /**
   * Handles the click event for the 'Take After Snapshot' button.
   * @private
   */
  private async handleTakeAfterSnapshot(): Promise<void> {
    if (this.selectedEntityTypeIds.length === 0) {
      this.showStatus('Please select at least one entity type', 'warning');
      return;
    }

    try {
      this.showStatus('Taking snapshot...', 'info');
      await this.domainStateManager.takeAfterSnapshot();
      this.showStatus('After snapshot taken successfully. You can now run the step.', 'success');
    } catch (error) {
      this.logger.error('Failed to take after snapshot:', error);
      // Error is likely already emitted by DomainStateManager, but show status just in case
      this.showStatus(
        `Failed to take snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      );
    }
  }

  /**
   * Renders the snapshots into the Before/After panels.
   * @param phase 'before' or 'after'
   * @param snapshots The snapshot data for the given phase.
   * @private
   */
  private renderSnapshots(phase: 'before' | 'after', snapshots: Record<string, unknown>): void {
    const targetElement =
      phase === 'before' ? this.beforeSnapshotDataElement : this.afterSnapshotDataElement;

    if (!targetElement) return;

    if (!snapshots || Object.keys(snapshots).length === 0) {
      targetElement.innerHTML = `<div class="empty-snapshot">No ${phase} snapshot data for selected entities.</div>`;
      return;
    }

    let html = '';
    const entityTypes = this.domainStateManager.getEntityTypes();

    Object.entries(snapshots).forEach(([typeId, snapshot]) => {
      const entityTypeInfo = entityTypes.find(t => t.id === typeId) || { name: typeId };
      const entityName = entityTypeInfo.name;

      // Add type checking for snapshot properties
      const typedSnapshot = snapshot as { id?: string; state?: unknown };
      const entityId = typedSnapshot.id || 'unknown';
      const state = typedSnapshot.state;

      html += `
        <div class="entity-snapshot collapsed">
          <div class="entity-snapshot-header">
            <h5>${entityName} (ID: ${entityId})</h5>
            <span class="expand-icon">▶</span>
          </div>
          <div class="entity-snapshot-body">
            ${
              state !== null
                ? `<pre class="snapshot-json">${this.formatJsonForDisplay(state)}</pre>`
                : '<div class="null-state">Entity state is null (possibly deleted or not found).</div>'
            }
          </div>
      </div>
    `;
    });

    targetElement.innerHTML = html;

    // Add event listeners to accordion headers
    targetElement.querySelectorAll('.entity-snapshot-header').forEach(header => {
      header.addEventListener('click', () => {
        const parent = header.closest('.entity-snapshot');
        if (parent) {
          parent.classList.toggle('collapsed');
          const expandIcon = header.querySelector('.expand-icon');
          if (expandIcon) {
            expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
          }
        }
      });
    });
  }

  /**
   * Renders the differences between snapshots into the Diff panel.
   * @private
   */
  private renderDiff(): void {
    if (!this.diffDataElement) return;

    const diffs = this.domainStateManager.calculateDiff();

    if (!diffs || Object.keys(diffs).length === 0) {
      this.diffDataElement.innerHTML =
        '<div class="empty-diff">No differences detected between snapshots.</div>';
      return;
    }

    let html = '';
    const entityTypes = this.domainStateManager.getEntityTypes();

    Object.entries(diffs).forEach(([typeId, diff]) => {
      const entityTypeInfo = entityTypes.find(t => t.id === typeId) || { name: typeId };
      const entityName = entityTypeInfo.name;

      // Add type checking for diff properties
      const typedDiff = diff as {
        id?: string;
        type?: string;
        added?: unknown;
        removed?: unknown;
        changes?: Record<string, unknown>;
      };
      const entityId = typedDiff.id || 'unknown';

      // Skip unchanged entries unless we want to explicitly show them
      if (typedDiff.type === 'unchanged') {
        // Optionally add an entry for unchanged items
        // html += `<div class="entity-diff collapsed unchanged">
        //             <div class="entity-diff-header"><h5>${entityName} (ID: ${entityId})</h5><span class="diff-type diff-type-unchanged">unchanged</span><span class="expand-icon">▶</span></div>
        //             <div class="entity-diff-body"><p>No changes detected.</p></div>
        //          </div>`;
        return;
      }

      html += `
        <div class="entity-diff collapsed">
          <div class="entity-diff-header">
            <h5>${entityName} (ID: ${entityId})</h5>
            <span class="diff-type diff-type-${typedDiff.type}">${typedDiff.type}</span>
            <span class="expand-icon">▶</span>
          </div>
          <div class="entity-diff-body">
      `;

      switch (typedDiff.type) {
        case 'new':
          html += `
            <div class="diff-new">
              <h6>New Entity State:</h6>
              <pre class="diff-json">${this.formatJsonForDisplay(typedDiff.added)}</pre>
            </div>
          `;
          break;
        case 'deleted':
          html += `
            <div class="diff-deleted">
              <h6>State Before Deletion:</h6>
              <pre class="diff-json">${this.formatJsonForDisplay(typedDiff.removed)}</pre>
            </div>
          `;
          break;
        case 'modified':
          html += `
            <div class="diff-modified">
              <h6>Modified Properties:</h6>
              ${typedDiff.changes ? this.renderChanges(typedDiff.changes) : 'No changes found'}
            </div>
          `;
          break;
      }

      html += `
          </div>
        </div>
      `;
    });

    this.diffDataElement.innerHTML =
      html || '<div class="empty-diff">No significant differences detected.</div>';

    // Add event listeners to accordion headers
    this.diffDataElement.querySelectorAll('.entity-diff-header').forEach(header => {
      header.addEventListener('click', () => {
        const parent = header.closest('.entity-diff');
        if (parent) {
          parent.classList.toggle('collapsed');
          const expandIcon = header.querySelector('.expand-icon');
          if (expandIcon) {
            expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
          }
        }
      });
    });
  }

  /**
   * Recursively renders the changes object into an HTML list.
   * @param changes The changes object from the diff calculation.
   * @returns HTML string representing the changes.
   * @private
   */
  private renderChanges(changes: Record<string, unknown>): string {
    let html = '<ul class="changes-list">';

    Object.entries(changes).forEach(([key, changeValue]) => {
      // Add type checking for change properties
      const change = changeValue as {
        action?: string;
        changes?: Record<string, unknown>;
        from?: unknown;
        to?: unknown;
        value?: unknown;
      };

      html += `<li class="change-item change-item-${change.action}">`;
      html += `<span class="change-path">${key}:</span>`;

      if (change.action === 'modified' && change.changes) {
        // Nested changes
        html += '<span class="change-action">modified</span>';
        html += this.renderChanges(change.changes); // Recursive call
      } else if (change.action === 'modified') {
        // Value change
        html += '<span class="change-action">modified</span>';
        html += '<div class="change-values">';
        html += `<span class="change-from" title="Previous value">${this.formatValueForDisplay(change.from)}</span>`;
        html += '<span class="change-arrow">→</span>';
        html += `<span class="change-to" title="New value">${this.formatValueForDisplay(change.to)}</span>`;
        html += '</div>';
      } else if (change.action === 'added') {
        html += '<span class="change-action">added</span>';
        html += '<div class="change-values">';
        html += `<span class="change-to">${this.formatValueForDisplay(change.value)}</span>`;
        html += '</div>';
      } else if (change.action === 'removed') {
        html += '<span class="change-action">removed</span>';
        html += '<div class="change-values">';
        html += `<span class="change-from">${this.formatValueForDisplay(change.value)}</span>`;
        html += '</div>';
      }
      html += '</li>';
    });

    html += '</ul>';
    return html;
  }

  /**
   * Formats a JSON object/value for display in a <pre> tag, handling potential errors.
   * @param value The value to format.
   * @returns Formatted JSON string or error message.
   * @private
   */
  private formatJsonForDisplay(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      this.logger.error('Error stringifying JSON for display:', error);
      return 'Error displaying value';
    }
  }

  /**
   * Formats a single value for display within the diff view.
   * @param value The value to format.
   * @returns HTML string representation of the value.
   * @private
   */
  private formatValueForDisplay(value: unknown): string {
    if (value === null) return '<span class="null-value">null</span>';
    if (value === undefined) return '<span class="undefined-value">undefined</span>';

    if (typeof value === 'object') {
      try {
        // Keep object display concise
        const jsonString = JSON.stringify(value);
        return `<span class="object-value" title='${this.escapeHtml(jsonString)}'>${this.escapeHtml(jsonString.substring(0, 50))}${jsonString.length > 50 ? '...' : ''}</span>`;
      } catch {
        return '<span class="object-value">[Object]</span>';
      }
    }

    if (typeof value === 'string') {
      return `<span class="string-value">"${this.escapeHtml(value)}"</span>`;
    }

    if (typeof value === 'number') {
      return `<span class="number-value">${value}</span>`;
    }

    if (typeof value === 'boolean') {
      return `<span class="boolean-value">${value}</span>`;
    }

    return this.escapeHtml(String(value));
  }

  /**
   * Escapes HTML special characters in a string.
   * @param str The input string.
   * @returns The escaped string.
   * @private
   */
  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Sets the currently active tab (Snapshots or Differences).
   * @param tabName The name of the tab to activate ('snapshot-view' or 'diff-view').
   * @private
   */
  private setActiveTab(tabName: string): void {
    if (!this.contentPanels[tabName]) {
      this.logger.warn(`Attempted to switch to unknown tab: ${tabName}`);
      return;
    }

    // Update tab buttons state
    this.tabButtons?.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
    });

    // Show/hide content panels
    Object.entries(this.contentPanels).forEach(([name, panel]) => {
      if (panel) {
        panel.classList.toggle('active', name === tabName);
      }
    });

    // If switching to diff view, ensure diff is rendered (it might have been calculated already)
    if (tabName === 'diff-view') {
      this.renderDiff();
    }
    this.logger.debug(`Switched to tab: ${tabName}`);
  }

  /**
   * Displays a status message below the snapshot button.
   * @param message The message text.
   * @param type The type of message ('info', 'success', 'error', 'warning').
   * @private
   */
  private showStatus(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ): void {
    if (this.snapshotStatusElement) {
      this.snapshotStatusElement.textContent = message;
      this.snapshotStatusElement.className = `snapshot-status snapshot-status-${type}`;

      // Auto-clear success/info messages after a delay
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          if (this.snapshotStatusElement && this.snapshotStatusElement.textContent === message) {
            this.snapshotStatusElement.textContent = '';
            this.snapshotStatusElement.className = 'snapshot-status';
          }
        }, 5000);
      }
    }
  }

  /**
   * Public method to trigger the 'after' snapshot. Should be called after the main API request completes.
   */
  public async triggerAfterSnapshot(): Promise<void> {
    if (this.selectedEntityTypeIds.length === 0) {
      this.logger.debug(
        'Skipping after snapshot: No entity types were selected for the before snapshot.',
      );
      return; // Don't take after snapshot if no before snapshot was relevant
    }
    await this.domainStateManager.takeAfterSnapshot();
  }

  /**
   * Publish an event through the EventBus
   * @param event Event name
   * @param data Event data
   */
  protected emit(event: string, data?: unknown): void {
    this.eventBus.publish(event, data);
  }
}
