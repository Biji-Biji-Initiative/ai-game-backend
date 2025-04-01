/**
 * Domain state management types
 */

/**
 * Entity type definition
 */
export interface EntityType {
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  properties?: EntityProperty[];
}

/**
 * Entity property definition
 */
export interface EntityProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'reference';
  displayName?: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  referenceType?: string; // If type is 'reference', this is the entity type it references
}

/**
 * Domain entity snapshot
 */
export interface EntitySnapshot {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: number;
  version?: number;
}

/**
 * State difference item
 */
export interface StateDiff {
  entityId: string;
  entityType: string;
  path: string;
  oldValue: any;
  newValue: any;
  changeType: 'add' | 'update' | 'delete' | 'move';
}

/**
 * Domain state snapshot
 */
export interface StateSnapshot {
  id: string;
  timestamp: number;
  entities: EntitySnapshot[];
  requestId?: string;
  description?: string;
}

/**
 * Domain state manager interface
 */
export interface IDomainStateManager {
  // State management
  loadState(state: any): void;
  saveState(): void;
  getState(): any;
  clearState(): void;
  
  // Entity operations
  addEntity(type: string, data: any): string;
  updateEntity(id: string, data: any): boolean;
  deleteEntity(id: string): boolean;
  getEntity(id: string): EntitySnapshot | null;
  getEntitiesByType(type: string): EntitySnapshot[];
  
  // Snapshot operations
  takeBeforeSnapshot(entityTypes?: string[]): string;
  takeAfterSnapshot(entityTypes?: string[]): string;
  getSnapshot(id: string): StateSnapshot | null;
  getLatestSnapshot(): StateSnapshot | null;
  getDiffs(beforeId: string, afterId: string): StateDiff[];
  
  // Events
  addEventListener(event: string, handler: (data: any) => void): void;
  removeEventListener(event: string, handler: (data: any) => void): void;
}

/**
 * Domain state viewer interface
 */
export interface IDomainStateViewer {
  // Rendering
  render(): void;
  clear(): void;
  refresh(): void;
  
  // Filters and settings
  setEntityTypes(types: string[]): void;
  getEntityTypes(): string[];
  setFilter(filter: string): void;
  clearFilter(): void;
  
  // Selection
  selectEntity(id: string): void;
  deselectEntity(): void;
  getSelectedEntity(): string | null;
  getSelectedEntityData(): any | null;
  
  // Properties for integration with DomainStateManager
  selectedEntityTypes: string[];
  
  // Events
  addEventListener(event: string, handler: (data: any) => void): void;
  removeEventListener(event: string, handler: (data: any) => void): void;
}

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  apiClient?: any;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
} 