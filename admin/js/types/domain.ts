// Types improved by ts-improve-types
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
  defaultValue?: unknown;
  referenceType?: string; // If type is 'reference', this is the entity type it references
}

/**
 * Domain entity snapshot
 */
export interface EntitySnapshot {
  id: string;
  type: string;
  data: Record<string, unknown>;
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
  oldValue: unknown;
  newValue: unknown;
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
  loadState(stat: Event): void;
  saveState(): void;
  getState(): unknown;
  clearState(): void;

  // Entity operations
  addEntity(typ: string, data: unknown[] | Record<string, unknown>): string;
  updateEntity(i: string, data: unknown[] | Record<string, unknown>): boolean;
  deleteEntity(i: string): boolean;
  getEntity(i: string): EntitySnapshot | null;
  getEntitiesByType(typ: string): EntitySnapshot[];

  // Snapshot operations
  takeBeforeSnapshot(entityTypes?: string[]): string;
  takeAfterSnapshot(entityTypes?: string[]): string;
  getSnapshot(i: string): StateSnapshot | null;
  getLatestSnapshot(): StateSnapshot | null;
  getDiffs(beforeI?: string, afterId?: string): StateDiff[];

  // Events
  addEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
  removeEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
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
  setEntityTypes(type: string[]): void;
  getEntityTypes(): string[];
  setFilter(filte: string): void;
  clearFilter(): void;

  // Selection
  selectEntity(i: string): void;
  deselectEntity(): void;
  getSelectedEntity(): string | null;
  getSelectedEntityData(): unknown | null;

  // Properties for integration with DomainStateManager
  selectedEntityTypes: string[];

  // Events
  addEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
  removeEventListener(
    even: string,
    handler: (data: unknown[] | Record<string, unknown>) => void,
  ): void;
}

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  apiClient?: unknown;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
}
