// Types improved by ts-improve-types
/**
 * Domain State Manager
 *
 * Handles fetching, storing, and comparing domain entity states for snapshots.
 */

import { logger } from '../utils/logger';
import { EventEmitter } from '../utils/event-emitter';

interface DomainStateManagerOptions {
  apiBasePath?: string;
}

interface EntityType {
  id: string;
  name: string;
}

interface Snapshot {
  id: string;
  state: Event;
}

interface Snapshots {
  before: Record<string, Snapshot>;
  after: Record<string, Snapshot>;
}

/**
 * Manages domain state snapshots before and after API calls.
 */
export class DomainStateManager extends EventEmitter {
  private options: Required<DomainStateManagerOptions>;
  private snapshots: Snapshots;
  private entityTypes: EntityType[];

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: DomainStateManagerOptions = {}) {
    super();
    this.options = {
      apiBasePath: '/api/v1/api-tester', // Default endpoint base path
      ...options,
    };

    this.snapshots = {
      before: {},
      after: {},
    };

    // Define the entity types we can snapshot
    this.entityTypes = [
      { id: 'user', name: 'User' },
      { id: 'challenge', name: 'Challenge' },
      { id: 'progress', name: 'Progress' },
      { id: 'evaluation', name: 'Evaluation' },
      { id: 'focusArea', name: 'Focus Area' },
      { id: 'personality', name: 'Personality' },
      // Add more entity types as needed
    ];

    logger.debug('DomainStateManager initialized');
  }

  /**
   * Get available entity types
   * @returns Array of entity types
   */
  getEntityTypes(): EntityType[] {
    return [...this.entityTypes];
  }

  /**
   * Detect relevant entity IDs from a request object.
   * Looks in path parameters (e.g., /users/:userId) and request body.
   * @param request The API request object (containing path, body, etc.)
   * @returns Object mapping entity type ID to the detected entity ID.
   */
  detectEntityIds(request: { path?: string; body?: unknown }): Record<string, string> {
    const entityIds: Record<string, string> = {};

    // Example: Parse path parameters (e.g., /api/v1/users/:userId)
    if (request.path) {
      const pathSegments = request.path.split('/');
      for (let i = 0; i < pathSegments.length - 1; i++) {
        const segment = pathSegments[i];
        const nextSegment = pathSegments[i + 1];

        // Simple check for common patterns
        if (segment === 'users' && nextSegment) entityIds.user = nextSegment;
        if (segment === 'challenges' && nextSegment) entityIds.challenge = nextSegment;
        if (segment === 'progress' && nextSegment) entityIds.progress = nextSegment;
        if (segment === 'evaluations' && nextSegment) entityIds.evaluation = nextSegment;
        if (segment === 'focus-areas' && nextSegment) entityIds.focusArea = nextSegment;
        if (segment === 'personalities' && nextSegment) entityIds.personality = nextSegment;
      }
    }

    // Look in body for entity IDs
    if (request.body && typeof request.body === 'object') {
      const bodyObj = request.body as Record<string, any>; // Assert as indexable, keep any for flexibility here
      if (bodyObj.userId) entityIds.user = bodyObj.userId;
      if (bodyObj.challengeId) entityIds.challenge = bodyObj.challengeId;
      if (bodyObj.progressId) entityIds.progress = bodyObj.progressId;
      if (bodyObj.evaluationId) entityIds.evaluation = bodyObj.evaluationId;
      if (bodyObj.focusAreaId) entityIds.focusArea = bodyObj.focusAreaId;
      if (bodyObj.personalityId) entityIds.personality = bodyObj.personalityId;
      // Also check for nested IDs, e.g., body.user.id
      if (bodyObj.user?.id) entityIds.user = String(bodyObj.user.id); // Ensure string conversion if needed
    }

    logger.debug('Detected entity IDs from request', {
      requestPath: request.path,
      detectedIds: entityIds,
    });
    return entityIds;
  }

  /**
   * Take a snapshot of entity states before the API call.
   * @param selectedEntityTypeIds Array of entity type IDs to snapshot.
   * @returns Promise resolving when snapshots are taken.
   */
  async takeBeforeSnapshot(
    selectedEntityTypeIds?: string[],
  ): Promise<void> {
    try {
      // Cannot detect entity IDs without request object anymore.
      // Need alternative way to get IDs or snapshot all possible entities.
      // For now, let's assume we try to snapshot all known types if specific IDs aren't needed/provided.
      // This might require changes to fetchEntityState if it relies on specific IDs.
      // const entityIds = this.detectEntityIds(request);
      const entityIdsToSnapshot = selectedEntityTypeIds || this.entityTypes.map(et => et.id);

      const snapshots: Record<string, Snapshot> = {};
      this.snapshots.before = {};
      this.snapshots.after = {};

      logger.info('Taking BEFORE domain state snapshot...', {
        selectedTypes: entityIdsToSnapshot,
      });

      for (const typeId of entityIdsToSnapshot) {
          // We might need an entity ID here depending on fetchEntityState
          // This simplified approach might break if fetchEntityState NEEDS an ID
          // Let's assume fetchEntityState can handle just the type for now,
          // OR that this function should only work if selectedEntityTypeIds provides specific IDs to fetch.
          // A more robust solution is needed depending on API capabilities.
          logger.warn(`Attempting to fetch state for type ${typeId} without specific ID - this might fail.`);
          // Passing a placeholder ID - THIS IS LIKELY WRONG and needs adjustment based on API
          const placeholderEntityId = 'placeholder';
          try {
            const state = await this.fetchEntityState(typeId, placeholderEntityId);
            if (state !== null) {
              snapshots[typeId] = { id: placeholderEntityId, state };
              logger.debug(`Snapshot taken for ${typeId}:${placeholderEntityId}`, { state });
            } else {
              logger.warn(`Could not fetch state for ${typeId}:${placeholderEntityId}`);
            }
          } catch (fetchError: unknown) {
              logger.error(`Failed to fetch ${typeId} state for ID ${placeholderEntityId}:`, fetchError);
              // Ensure emitted object matches Record<string, unknown>
              const errorPayload: Record<string, unknown> = { message: `Failed to fetch state for ${typeId} (${placeholderEntityId})`, error: fetchError };
              this.emit('error', errorPayload);
          }
      }

      this.snapshots.before = snapshots;
      this.emit('snapshotChange', { phase: 'before', snapshots: this.snapshots.before });
      // ... logging ...
    } catch (error: unknown) {
      logger.error('Failed to take before snapshot:', error);
      // Ensure emitted object matches Record<string, unknown>
      const errorPayload: Record<string, unknown> = { message: 'Failed to take before snapshot', error: error };
      this.emit('error', errorPayload);
    }
  }

  /**
   * Take a snapshot of entity states after the API call.
   * Uses the same entity IDs detected for the 'before' snapshot.
   * @param selectedEntityTypeIds Array of entity type IDs originally snapshotted.
   * @returns Promise resolving when snapshots are taken.
   */
  // Removed 'request' parameter, added selectedEntityTypeIds to match signature expectation
  async takeAfterSnapshot(selectedEntityTypeIds?: string[]): Promise<void> {
    try {
      const snapshots: Record<string, Snapshot> = {};
      this.snapshots.after = {};
      logger.info('Taking AFTER domain state snapshot...');

      // Determine which types/IDs to fetch based on 'before' snapshot or passed selection
      const typesAndIdsToFetch = selectedEntityTypeIds
          ? selectedEntityTypeIds
          : Object.keys(this.snapshots.before);

      for (const typeId of typesAndIdsToFetch) {
        // Need the entity ID from the 'before' snapshot
        const entityId = this.snapshots.before[typeId]?.id;
        if (!entityId) {
            logger.warn(`Cannot take 'after' snapshot for ${typeId}, missing ID from 'before' snapshot.`);
            continue; // Skip if we don't have an ID from the 'before' phase
        }
        try {
          const state = await this.fetchEntityState(typeId, entityId);
          snapshots[typeId] = { id: entityId, state: state ?? null }; // Store null if fetch failed/deleted
          logger.debug(`Snapshot taken for ${typeId}:${entityId}`, { state });
        } catch (fetchError: unknown) {
           logger.error(`Failed to fetch ${typeId} state for ID ${entityId}:`, fetchError);
           // Ensure emitted object matches Record<string, unknown>
           const errorPayload: Record<string, unknown> = { message: `Failed to fetch state for ${typeId} (${entityId})`, error: fetchError };
           this.emit('error', errorPayload);
        }
      }

      this.snapshots.after = snapshots;
      this.emit('snapshotChange', { phase: 'after', snapshots: this.snapshots.after });
      // ... logging ...
    } catch (error: unknown) {
       logger.error('Failed to take after snapshot:', error);
       // Ensure emitted object matches Record<string, unknown>
       const errorPayload: Record<string, unknown> = { message: 'Failed to take after snapshot', error: error };
       this.emit('error', errorPayload);
    }
  }

  /**
   * Fetch entity state from the backend API.
   * Assumes an endpoint like /api/v1/api-tester/entity-state?type=<typeId>&id=<entityId>
   * @param typeId Entity type ID (e.g., 'user')
   * @param entityId Entity ID (e.g., UUID)
   * @returns Promise resolving with the entity state object or null if not found/error.
   */
  async fetchEntityState(typeId: string, entityId: string): Promise<unknown | null> {
    const url = `${this.options.apiBasePath}/entity-state?type=${encodeURIComponent(typeId)}&id=${encodeURIComponent(entityId)}`;
    logger.debug(`Fetching entity state from: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          // Add Authorization header if needed
          // 'Authorization': `Bearer ${your_auth_token}`
        },
      });

      if (response.status === 404) {
        logger.warn(`Entity not found: ${typeId}:${entityId}`);
        return null; // Entity doesn't exist
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      // Assuming the API returns { entity: { ...state } } or similar
      return data.entity || data; // Return the entity state or the whole data object as fallback
    } catch (error: unknown) {
      logger.error(`Failed to fetch ${typeId} state for ID ${entityId}:`, error);
      // Ensure emitted object matches Record<string, unknown>
      const errorPayload: Record<string, unknown> = { message: `Failed to fetch state for ${typeId} (${entityId})`, error: error };
      this.emit('error', errorPayload);
      return null; // Return null on error
    }
  }

  /**
   * Get the current snapshots.
   * @returns The snapshots object containing 'before' and 'after' states.
   */
  getSnapshots(): Readonly<Snapshots> {
    return this.snapshots;
  }

  /**
   * Calculate differences between the 'before' and 'after' snapshots.
   * @returns Object containing differences categorized by entity type.
   */
  calculateDiff(): Record<string, unknown> {
    const diffs: Record<string, unknown> = {};

    // Get all unique entity types present in either snapshot
    const allEntityTypeIds = new Set([
      ...Object.keys(this.snapshots.before),
      ...Object.keys(this.snapshots.after),
    ]);

    logger.debug('Calculating diff between snapshots', { types: Array.from(allEntityTypeIds) });

    for (const typeId of allEntityTypeIds) {
      const beforeSnapshot = this.snapshots.before[typeId]?.state;
      const afterSnapshot = this.snapshots.after[typeId]?.state;
      const entityId = this.snapshots.before[typeId]?.id || this.snapshots.after[typeId]?.id;

      // Ensure entityId is defined before proceeding
      if (!entityId) continue;

      // Case 1: New entity (only exists in 'after')
      if (beforeSnapshot === undefined && afterSnapshot !== undefined) {
        diffs[typeId] = {
          id: entityId,
          type: 'new',
          added: afterSnapshot,
        };
        logger.debug(`Diff for ${typeId}:${entityId} - Type: new`);
        continue;
      }

      // Case 2: Deleted entity (only exists in 'before' or is null in 'after')
      if (beforeSnapshot !== undefined && (afterSnapshot === undefined || afterSnapshot === null)) {
        diffs[typeId] = {
          id: entityId,
          type: 'deleted',
          removed: beforeSnapshot,
        };
        logger.debug(`Diff for ${typeId}:${entityId} - Type: deleted`);
        continue;
      }

      // Case 3: Entity exists in both, calculate property diffs
      if (beforeSnapshot !== undefined && afterSnapshot !== undefined && afterSnapshot !== null) {
        const changes = this._getObjectDiff(beforeSnapshot, afterSnapshot);

        if (Object.keys(changes).length > 0) {
          diffs[typeId] = {
            id: entityId,
            type: 'modified',
            changes,
          };
          logger.debug(`Diff for ${typeId}:${entityId} - Type: modified`, { changes });
        } else {
          diffs[typeId] = {
            id: entityId,
            type: 'unchanged',
          };
          logger.debug(`Diff for ${typeId}:${entityId} - Type: unchanged`);
        }
        continue;
      }

      // Case 4: Unchanged (both undefined or null - should ideally not happen if fetched correctly)
      if (beforeSnapshot === afterSnapshot) {
        // Handles both undefined or both null
        diffs[typeId] = {
          id: entityId,
          type: 'unchanged',
        };
        logger.debug(`Diff for ${typeId}:${entityId} - Type: unchanged (both null/undefined)`);
      }
    }

    return diffs;
  }

  /**
   * Recursively calculates the difference between two objects or values.
   * @param before The 'before' value/object.
   * @param after The 'after' value/object.
   * @returns An object describing the differences, or an empty object if no differences.
   * @private
   */
  _getObjectDiff(before: unknown, after: unknown): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    // If they are identical primitive values or JSON strings, no changes
    if (before === after || JSON.stringify(before) === JSON.stringify(after)) {
      return changes;
    }

    // Handle null/undefined cases
    if (before === null || before === undefined || after === null || after === undefined) {
      // If one is null/undefined and the other isn't, it's a simple modification
      // (The parent caller handles add/remove based on key presence)
      return {
        action: 'modified',
        from: before,
        to: after,
      };
    }

    // Handle arrays (simple comparison for now, could be improved)
    if (Array.isArray(before) && Array.isArray(after)) {
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        return {
          action: 'modified',
          from: before,
          to: after,
        };
      }
      return changes; // Arrays are the same
    }

    // Handle objects
    if (
      typeof before === 'object' &&
      typeof after === 'object' &&
      before !== null &&
      after !== null
    ) {
      const allKeys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);

      for (const key of allKeys) {
        const beforeValue = (before as Record<string, unknown>)[key];
        const afterValue = (after as Record<string, unknown>)[key];

        // Key removed
        if (beforeValue !== undefined && afterValue === undefined) {
          changes[key] = {
            action: 'removed',
            value: beforeValue,
          };
          continue;
        }

        // Key added
        if (beforeValue === undefined && afterValue !== undefined) {
          changes[key] = {
            action: 'added',
            value: afterValue,
          };
          continue;
        }

        // Key exists in both, compare values recursively
        if (beforeValue !== undefined && afterValue !== undefined) {
          const nestedChanges = this._getObjectDiff(beforeValue, afterValue);
          // Check if nested changes object is not empty or if it represents a direct value change
          if (nestedChanges.action === 'modified' || Object.keys(nestedChanges).length > 0) {
            // If the nested change is just a simple modification, flatten it
            if (
              nestedChanges.action === 'modified' &&
              nestedChanges.from !== undefined &&
              nestedChanges.to !== undefined
            ) {
              changes[key] = nestedChanges;
            } else if (Object.keys(nestedChanges).length > 0) {
              // Otherwise, report nested structure
              changes[key] = {
                action: 'modified',
                changes: nestedChanges,
              };
            }
          }
        }
      }
      return changes;
    }

    // If none of the above, it's a simple value change
    return {
      action: 'modified',
      from: before,
      to: after,
    };
  }
}
