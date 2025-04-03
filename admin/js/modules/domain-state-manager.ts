// Types improved by ts-improve-types
/**
 * Domain State Manager
 *
 * Handles fetching, storing, and comparing domain entity states for snapshots.
 */

import { ComponentLogger } from '../core/Logger';
import { EventBus } from '../core/EventBus';

interface DomainStateManagerOptions {
  apiBasePath?: string;
  eventBus: EventBus;
  logger: ComponentLogger;
}

interface EntityType {
  id: string;
  name: string;
}

interface Snapshot {
  id: string;
  state: unknown;
}

interface Snapshots {
  before: Record<string, Snapshot>;
  after: Record<string, Snapshot>;
}

/**
 * Manages domain state snapshots before and after API calls.
 */
export class DomainStateManager {
  private options: Required<DomainStateManagerOptions>;
  private snapshots: Snapshots;
  private entityTypes: EntityType[];
  private eventBus: EventBus;
  private logger: ComponentLogger;

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: DomainStateManagerOptions) {
    this.options = {
      apiBasePath: '/api/v1/api-tester', // Default endpoint base path
      ...options,
    };
    
    this.eventBus = options.eventBus;
    this.logger = options.logger;

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

    this.logger.debug('DomainStateManager initialized');
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
      const bodyObj = request.body as Record<string, unknown>; // Use unknown instead of any
      if (bodyObj.userId) entityIds.user = String(bodyObj.userId);
      if (bodyObj.challengeId) entityIds.challenge = String(bodyObj.challengeId);
      if (bodyObj.progressId) entityIds.progress = String(bodyObj.progressId);
      if (bodyObj.evaluationId) entityIds.evaluation = String(bodyObj.evaluationId);
      if (bodyObj.focusAreaId) entityIds.focusArea = String(bodyObj.focusAreaId);
      if (bodyObj.personalityId) entityIds.personality = String(bodyObj.personalityId);
      // Also check for nested IDs, e.g., body.user.id
      if (bodyObj.user && typeof bodyObj.user === 'object' && 'id' in bodyObj.user) {
        entityIds.user = String((bodyObj.user as Record<string, unknown>).id);
      }
    }

    this.logger.debug('Detected entity IDs from request', {
      requestPath: request.path,
      detectedIds: entityIds,
    });
    return entityIds;
  }

  /**
   * Take a snapshot of entity states before the API call.
   * @param request The API request object (containing path, body, etc.)
   * @param selectedEntityTypeIds Array of entity type IDs to snapshot.
   * @returns Promise resolving when snapshots are taken.
   */
  async takeBeforeSnapshot(
    request: { path?: string; body?: unknown },
    selectedEntityTypeIds?: string[],
  ): Promise<void> {
    try {
      // Use the request object to detect entity IDs
      const entityIds = this.detectEntityIds(request);
      const entityIdsToSnapshot = selectedEntityTypeIds || this.entityTypes.map(et => et.id);

      const snapshots: Record<string, Snapshot> = {};
      this.snapshots.before = {};
      this.snapshots.after = {};

      this.logger.info('Taking BEFORE domain state snapshot...', {
        selectedTypes: entityIdsToSnapshot,
        detectedIds: entityIds,
      });

      for (const typeId of entityIdsToSnapshot) {
        // Use detected entity ID if available, otherwise use placeholder
        const entityId = entityIds[typeId] || 'placeholder';
        try {
          const state = await this.fetchEntityState(typeId, entityId);
          if (state !== null) {
            snapshots[typeId] = { id: entityId, state };
            this.logger.debug(`Snapshot taken for ${typeId}:${entityId}`, { state });
          } else {
            this.logger.warn(`Could not fetch state for ${typeId}:${entityId}`);
          }
        } catch (fetchError: unknown) {
          this.logger.error(`Failed to fetch ${typeId} state for ID ${entityId}:`, fetchError);
          // Ensure emitted object matches Record<string, unknown>
          const errorPayload: Record<string, unknown> = {
            message: `Failed to fetch state for ${typeId} (${entityId})`,
            error: fetchError,
          };
          this.eventBus.publish('error', errorPayload);
        }
      }

      this.snapshots.before = snapshots;
      this.eventBus.publish('snapshotChange', { phase: 'before', snapshots: this.snapshots.before });
      // ... logging ...
    } catch (error: unknown) {
      this.logger.error('Failed to take before snapshot:', error);
      // Ensure emitted object matches Record<string, unknown>
      const errorPayload: Record<string, unknown> = {
        message: 'Failed to take before snapshot',
        error: error,
      };
      this.eventBus.publish('error', errorPayload);
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
      this.logger.info('Taking AFTER domain state snapshot...');

      // Determine which types/IDs to fetch based on 'before' snapshot or passed selection
      const typesAndIdsToFetch = selectedEntityTypeIds
        ? selectedEntityTypeIds
        : Object.keys(this.snapshots.before);

      for (const typeId of typesAndIdsToFetch) {
        // Need the entity ID from the 'before' snapshot
        const entityId = this.snapshots.before[typeId]?.id;
        if (!entityId) {
          this.logger.warn(
            `Cannot take 'after' snapshot for ${typeId}, missing ID from 'before' snapshot.`,
          );
          continue; // Skip if we don't have an ID from the 'before' phase
        }
        try {
          const state = await this.fetchEntityState(typeId, entityId);
          snapshots[typeId] = { id: entityId, state: state ?? null }; // Store null if fetch failed/deleted
          this.logger.debug(`Snapshot taken for ${typeId}:${entityId}`, { state });
        } catch (fetchError: unknown) {
          this.logger.error(`Failed to fetch ${typeId} state for ID ${entityId}:`, fetchError);
          // Ensure emitted object matches Record<string, unknown>
          const errorPayload: Record<string, unknown> = {
            message: `Failed to fetch state for ${typeId} (${entityId})`,
            error: fetchError,
          };
          this.eventBus.publish('error', errorPayload);
        }
      }

      this.snapshots.after = snapshots;
      this.eventBus.publish('snapshotChange', { phase: 'after', snapshots: this.snapshots.after });
      // ... logging ...
    } catch (error: unknown) {
      this.logger.error('Failed to take after snapshot:', error);
      // Ensure emitted object matches Record<string, unknown>
      const errorPayload: Record<string, unknown> = {
        message: 'Failed to take after snapshot',
        error: error,
      };
      this.eventBus.publish('error', errorPayload);
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
    this.logger.debug(`Fetching entity state from: ${url}`);

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
        this.logger.warn(`Entity not found: ${typeId}:${entityId}`);
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
      this.logger.error(`Failed to fetch ${typeId} state for ID ${entityId}:`, error);
      return null; // Return null if there's an error
    }
  }

  /**
   * Calculate differences between before and after snapshots
   * @returns Object of differences by entity type
   */
  calculateDiff(): Record<string, unknown> {
    const diff: Record<string, unknown> = {};

    // For each entity type in before, compare with after
    for (const typeId in this.snapshots.before) {
      if (Object.prototype.hasOwnProperty.call(this.snapshots.before, typeId)) {
        const beforeState = this.snapshots.before[typeId]?.state;
        const afterState = this.snapshots.after[typeId]?.state;

        // Calculate difference
        diff[typeId] = this.getObjectDiff(beforeState, afterState);
      }
    }

    return diff;
  }

  /**
   * Calculate the difference between two objects
   * @param before Before object
   * @param after After object
   * @returns Difference object
   */
  private getObjectDiff(before: unknown, after: unknown): Record<string, unknown> {
    // Handle cases where either object is null/undefined
    if (before === null || before === undefined) {
      return { _diff_type: 'created', value: after };
    }
    if (after === null || after === undefined) {
      return { _diff_type: 'deleted', value: before };
    }

    // If types don't match, return full objects
    if (typeof before !== typeof after) {
      return {
        _diff_type: 'changed_type',
        before: { type: typeof before, value: before },
        after: { type: typeof after, value: after },
      };
    }

    // Handle primitive types
    if (
      typeof before === 'string' ||
      typeof before === 'number' ||
      typeof before === 'boolean'
    ) {
      if (before === after) return {}; // No change
      return {
        _diff_type: 'changed_value',
        before,
        after,
      };
    }

    // Ensure we're working with objects
    if (typeof before !== 'object' || typeof after !== 'object') {
      return {}; // Not comparable
    }

    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const diff: Record<string, unknown> = {};

    // Check keys in before that may have changed or been removed
    for (const key in beforeObj) {
      if (Object.prototype.hasOwnProperty.call(beforeObj, key)) {
        if (!(key in afterObj)) {
          // Key was removed
          diff[key] = { _diff_type: 'removed', value: beforeObj[key] };
        } else if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
          // Value changed, recursively get diff
          const nestedDiff = this.getObjectDiff(beforeObj[key], afterObj[key]);
          if (Object.keys(nestedDiff).length > 0) {
            diff[key] = nestedDiff;
          }
        }
      }
    }

    // Check for new keys in after
    for (const key in afterObj) {
      if (
        Object.prototype.hasOwnProperty.call(afterObj, key) &&
        !(key in beforeObj)
      ) {
        // Key was added
        diff[key] = { _diff_type: 'added', value: afterObj[key] };
      }
    }

    return diff;
  }
}
