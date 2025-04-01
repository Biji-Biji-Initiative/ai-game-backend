/**
 * DomainStateManager Module
 * Manages domain state data and updates
 */

import { logger } from '../utils/logger';
import { DomainStateViewer } from '../components/DomainStateViewer';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/storage-utils';

/**
 * Interface for DomainStateManager options
 */
export interface DomainStateManagerOptions {
  viewer?: DomainStateViewer;
  storageKey?: string;
  enablePersistence?: boolean;
  stateEndpoint?: string;
  diffingEnabled?: boolean;
  storagePrefix?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: DomainStateManagerOptions = {
  storageKey: 'domain_state',
  enablePersistence: true,
  stateEndpoint: '/api/v1/state',
  diffingEnabled: true,
  storagePrefix: 'admin_ui'
};

/**
 * DomainStateManager class
 * Manages domain state data and persistence
 */
export class DomainStateManager {
  private options: Required<DomainStateManagerOptions>;
  private state: Record<string, any> = {};
  private previousState: Record<string, any> = {};
  private viewer: DomainStateViewer | null;
  
  /**
   * Creates a new DomainStateManager instance
   * @param options Manager options
   */
  constructor(options: DomainStateManagerOptions = {}) {
    // Apply default options
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<DomainStateManagerOptions>;
    
    // Initialize properties
    this.viewer = this.options.viewer || null;
    
    // Log initialization
    logger.debug('DomainStateManager: Initializing');
  }
  
  /**
   * Initializes the manager
   */
  public initialize(): void {
    try {
      // Load persisted state if enabled
      if (this.options.enablePersistence) {
        this.loadState();
      }
      
      // Initialize the viewer if available
      if (this.viewer) {
        this.viewer.initialize();
        this.updateViewer();
      }
      
      logger.info('DomainStateManager: Initialized successfully');
        } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to initialize:', errorMessage);
        }
    }
    
    /**
   * Sets a state value
   * @param key State key
   * @param value State value
   * @param persist Whether to persist the updated state
   */
  public setState(key: string, value: any, persist: boolean = true): void {
    try {
      // Save previous state for diffing if enabled
      if (this.options.diffingEnabled) {
        this.previousState = { ...this.state };
      }
      
      // Update the state
      this.state[key] = value;
      
      // Update the viewer
      this.updateViewer();
      
      // Persist the state if enabled
      if (persist && this.options.enablePersistence) {
        this.persistState();
      }
      
      logger.debug(`DomainStateManager: Set state value for key "${key}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`DomainStateManager: Failed to set state for key "${key}":`, errorMessage);
    }
  }
  
  /**
   * Gets a state value
   * @param key State key
   * @param defaultValue Default value if key doesn't exist
   * @returns State value or default value
   */
  public getState<T>(key: string, defaultValue?: T): T | undefined {
    return key in this.state ? this.state[key] : defaultValue;
  }
  
  /**
   * Gets the entire state object
   * @returns Complete state object
   */
  public getAllState(): Record<string, any> {
    return { ...this.state };
  }
  
  /**
   * Removes a state value
   * @param key State key
   * @param persist Whether to persist the updated state
   */
  public removeState(key: string, persist: boolean = true): void {
    try {
      // Save previous state for diffing if enabled
      if (this.options.diffingEnabled) {
        this.previousState = { ...this.state };
      }
      
      // Remove the state key
      if (key in this.state) {
        delete this.state[key];
        
        // Update the viewer
        this.updateViewer();
        
        // Persist the state if enabled
        if (persist && this.options.enablePersistence) {
          this.persistState();
        }
        
        logger.debug(`DomainStateManager: Removed state value for key "${key}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`DomainStateManager: Failed to remove state for key "${key}":`, errorMessage);
    }
  }
  
  /**
   * Clears all state values
   * @param persist Whether to persist the cleared state
   */
  public clearState(persist: boolean = true): void {
    try {
      // Save previous state for diffing if enabled
      if (this.options.diffingEnabled) {
        this.previousState = { ...this.state };
      }
      
      // Clear the state
      this.state = {};
      
      // Update the viewer
      this.updateViewer();
      
      // Persist the state if enabled
      if (persist && this.options.enablePersistence) {
        this.persistState();
      }
      
      logger.debug('DomainStateManager: Cleared all state values');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to clear state:', errorMessage);
    }
  }
  
  /**
   * Updates the state viewer with current state
   */
  private updateViewer(): void {
    if (this.viewer) {
      const diff = this.options.diffingEnabled 
        ? this.calculateDiff(this.previousState, this.state)
        : null;
        
      this.viewer.updateState(this.state, diff);
        }
    }
    
    /**
   * Calculates the difference between previous and current state
   * @param oldState Previous state
   * @param newState Current state
   * @returns Diff object showing added, updated, and removed properties
   */
  private calculateDiff(oldState: Record<string, any>, newState: Record<string, any>): Record<string, any> {
    const diff: Record<string, any> = {
      added: {},
      updated: {},
      removed: {}
    };
    
    // Find added and updated properties
    Object.keys(newState).forEach(key => {
      if (!(key in oldState)) {
        diff.added[key] = newState[key];
      } else if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        diff.updated[key] = {
          from: oldState[key],
          to: newState[key]
        };
      }
    });
    
    // Find removed properties
    Object.keys(oldState).forEach(key => {
      if (!(key in newState)) {
        diff.removed[key] = oldState[key];
      }
    });
    
    return diff;
  }
  
  /**
   * Persists the current state to storage
   */
  private persistState(): void {
    try {
      const storageOptions = {
        prefix: this.options.storagePrefix
      };
      
      setLocalStorageItem(this.options.storageKey, this.state, storageOptions);
      logger.debug('DomainStateManager: State persisted to storage');
        } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to persist state:', errorMessage);
        }
    }
    
    /**
   * Loads state from storage
   */
  private loadState(): void {
    try {
      const storageOptions = {
        prefix: this.options.storagePrefix
      };
      
      const storedState = getLocalStorageItem<Record<string, any>>(
        this.options.storageKey, 
        storageOptions
      );
      
      if (storedState) {
        this.state = storedState;
        logger.debug('DomainStateManager: State loaded from storage');
      }
        } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to load state from storage:', errorMessage);
        }
    }
    
    /**
   * Updates state from API response
   * @param response API response object
   * @param stateKey Optional key to extract from response
   */
  public updateFromResponse(response: any, stateKey?: string): void {
    try {
      if (!response) return;
      
      // Save previous state for diffing if enabled
      if (this.options.diffingEnabled) {
        this.previousState = { ...this.state };
      }
      
      if (stateKey && typeof response === 'object' && stateKey in response) {
        // Extract specific key from response
        this.setState(stateKey, response[stateKey]);
      } else if (typeof response === 'object' && 'state' in response) {
        // Handle response with 'state' property
        const stateData = response.state;
        
        if (typeof stateData === 'object' && stateData !== null) {
          // Update all keys from state object
          for (const [key, value] of Object.entries(stateData)) {
            this.setState(key, value, false);
          }
          
          // Persist the full state once
          if (this.options.enablePersistence) {
            this.persistState();
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to update state from response:', errorMessage);
    }
  }
  
  /**
   * Checks if a state key exists
   * @param key State key
   * @returns Whether the key exists
   */
  public hasState(key: string): boolean {
    return key in this.state;
  }
  
  /**
   * Fetches current state from the API
   * @returns Promise resolving to the state data
   */
  public async fetchStateFromApi(): Promise<Record<string, any>> {
    try {
      const response = await fetch(this.options.stateEndpoint);
      
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Save previous state for diffing if enabled
      if (this.options.diffingEnabled) {
        this.previousState = { ...this.state };
      }
      
      if (data && typeof data === 'object') {
        if ('state' in data && typeof data.state === 'object') {
          // State is nested under 'state' property
          this.state = data.state;
            } else {
          // State is the entire response
          this.state = data;
        }
        
        // Update viewer and persist
        this.updateViewer();
        
        if (this.options.enablePersistence) {
          this.persistState();
        }
        
        logger.info('DomainStateManager: State fetched from API');
      }
      
      return this.getAllState();
            } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DomainStateManager: Failed to fetch state from API:', errorMessage);
      throw error;
    }
  }
} 