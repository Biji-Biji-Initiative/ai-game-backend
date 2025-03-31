/**
 * Domain State Manager
 * Handles fetching and managing domain entity states for snapshots
 */

class DomainStateManager {
    /**
     * Create a new domain state manager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            apiBasePath: '/api/v1/api-tester',
            ...options
        };
        
        this.snapshots = {
            before: {},
            after: {}
        };
        
        this.entityTypes = [
            { id: 'user', name: 'User' },
            { id: 'challenge', name: 'Challenge' },
            { id: 'progress', name: 'Progress' },
            { id: 'evaluation', name: 'Evaluation' },
            { id: 'focusArea', name: 'Focus Area' },
            { id: 'personality', name: 'Personality' }
        ];
        
        this.listeners = {
            onSnapshotChange: [],
            onError: []
        };
    }
    
    /**
     * Initialize the manager
     */
    async init() {
        try {
            // You could fetch available entity types from the server if needed
            console.log('Domain State Manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Domain State Manager:', error);
            this._notifyError('Initialization failed', error);
            return false;
        }
    }
    
    /**
     * Get entity types
     * @returns {Array} List of entity types
     */
    getEntityTypes() {
        return this.entityTypes;
    }
    
    /**
     * Detect entity IDs in the request
     * @param {Object} request - The request object
     * @returns {Object} Detected entity IDs by type
     */
    detectEntityIds(request) {
        const entityIds = {};
        
        // Parse path parameters (e.g., /api/v1/users/:userId)
        if (request.path) {
            // Match userId in path
            const userIdMatch = request.path.match(/\/users\/([a-f0-9-]+)/i);
            if (userIdMatch && userIdMatch[1]) {
                entityIds.user = userIdMatch[1];
            }
            
            // Match challengeId in path
            const challengeIdMatch = request.path.match(/\/challenges\/([a-f0-9-]+)/i);
            if (challengeIdMatch && challengeIdMatch[1]) {
                entityIds.challenge = challengeIdMatch[1];
            }
            
            // Match progressId in path
            const progressIdMatch = request.path.match(/\/progress\/([a-f0-9-]+)/i);
            if (progressIdMatch && progressIdMatch[1]) {
                entityIds.progress = progressIdMatch[1];
            }
            
            // Match evaluationId in path
            const evaluationIdMatch = request.path.match(/\/evaluations\/([a-f0-9-]+)/i);
            if (evaluationIdMatch && evaluationIdMatch[1]) {
                entityIds.evaluation = evaluationIdMatch[1];
            }
        }
        
        // Look in body for entity IDs
        if (request.body && typeof request.body === 'object') {
            // Extract entity IDs from the request body
            const bodyObj = request.body;
            
            if (bodyObj.userId) entityIds.user = bodyObj.userId;
            if (bodyObj.challengeId) entityIds.challenge = bodyObj.challengeId;
            if (bodyObj.progressId) entityIds.progress = bodyObj.progressId;
            if (bodyObj.evaluationId) entityIds.evaluation = bodyObj.evaluationId;
            if (bodyObj.focusAreaId) entityIds.focusArea = bodyObj.focusAreaId;
            if (bodyObj.personalityId) entityIds.personality = bodyObj.personalityId;
        }
        
        return entityIds;
    }
    
    /**
     * Take a snapshot of entity state before executing a step
     * @param {Object} request - The request object
     * @param {Array} selectedEntityTypes - Types of entities to snapshot
     * @returns {Promise<Object>} The entity snapshots
     */
    async takeBeforeSnapshot(request, selectedEntityTypes = []) {
        try {
            const entityIds = this.detectEntityIds(request);
            const snapshots = {};
            
            // Clear previous snapshots
            this.snapshots.before = {};
            
            // Only snapshot selected entity types that have IDs
            for (const type of selectedEntityTypes) {
                if (entityIds[type]) {
                    const state = await this.fetchEntityState(type, entityIds[type]);
                    snapshots[type] = {
                        id: entityIds[type],
                        state
                    };
                }
            }
            
            // Save snapshots
            this.snapshots.before = snapshots;
            this._notifySnapshotChange('before', snapshots);
            
            return snapshots;
        } catch (error) {
            console.error('Failed to take before snapshot:', error);
            this._notifyError('Failed to take before snapshot', error);
            return {};
        }
    }
    
    /**
     * Take a snapshot of entity state after executing a step
     * @param {Object} request - The request object
     * @param {Array} selectedEntityTypes - Types of entities to snapshot
     * @returns {Promise<Object>} The entity snapshots
     */
    async takeAfterSnapshot(request, selectedEntityTypes = []) {
        try {
            const entityIds = this.detectEntityIds(request);
            const snapshots = {};
            
            // Clear previous snapshots
            this.snapshots.after = {};
            
            // Only snapshot selected entity types that have IDs
            for (const type of selectedEntityTypes) {
                if (entityIds[type]) {
                    const state = await this.fetchEntityState(type, entityIds[type]);
                    snapshots[type] = {
                        id: entityIds[type],
                        state
                    };
                }
            }
            
            // Save snapshots
            this.snapshots.after = snapshots;
            this._notifySnapshotChange('after', snapshots);
            
            return snapshots;
        } catch (error) {
            console.error('Failed to take after snapshot:', error);
            this._notifyError('Failed to take after snapshot', error);
            return {};
        }
    }
    
    /**
     * Fetch entity state from the backend
     * @param {string} type - Entity type
     * @param {string} id - Entity ID
     * @returns {Promise<Object>} Entity state
     */
    async fetchEntityState(type, id) {
        try {
            const url = `${this.options.apiBasePath}/entity-state?type=${type}&id=${id}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${type} state: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.entity || null;
        } catch (error) {
            console.error(`Failed to fetch ${type} state:`, error);
            this._notifyError(`Failed to fetch ${type} state`, error);
            return null;
        }
    }
    
    /**
     * Get the current snapshots
     * @returns {Object} The current snapshots
     */
    getSnapshots() {
        return this.snapshots;
    }
    
    /**
     * Calculate differences between before and after snapshots
     * @returns {Object} Differences by entity type
     */
    calculateDiff() {
        const diffs = {};
        
        // Get all entity types from both snapshots
        const entityTypes = new Set([
            ...Object.keys(this.snapshots.before),
            ...Object.keys(this.snapshots.after)
        ]);
        
        // Calculate diff for each entity type
        for (const type of entityTypes) {
            const beforeSnapshot = this.snapshots.before[type]?.state || null;
            const afterSnapshot = this.snapshots.after[type]?.state || null;
            
            // New entity (only exists in after)
            if (!beforeSnapshot && afterSnapshot) {
                diffs[type] = {
                    type: 'new',
                    added: afterSnapshot
                };
                continue;
            }
            
            // Deleted entity (only exists in before)
            if (beforeSnapshot && !afterSnapshot) {
                diffs[type] = {
                    type: 'deleted',
                    removed: beforeSnapshot
                };
                continue;
            }
            
            // Both exist, calculate property diffs
            if (beforeSnapshot && afterSnapshot) {
                const changes = this._getObjectDiff(beforeSnapshot, afterSnapshot);
                
                if (Object.keys(changes).length > 0) {
                    diffs[type] = {
                        type: 'modified',
                        changes
                    };
                } else {
                    diffs[type] = {
                        type: 'unchanged'
                    };
                }
            }
        }
        
        return diffs;
    }
    
    /**
     * Get difference between two objects
     * @param {Object} before - Object before
     * @param {Object} after - Object after
     * @returns {Object} Differences
     * @private
     */
    _getObjectDiff(before, after) {
        const changes = {};
        
        // Get all keys from both objects
        const allKeys = new Set([
            ...Object.keys(before || {}),
            ...Object.keys(after || {})
        ]);
        
        for (const key of allKeys) {
            // Skip if properties are same
            if (JSON.stringify(before[key]) === JSON.stringify(after[key])) {
                continue;
            }
            
            // Property only in before (removed)
            if (before.hasOwnProperty(key) && !after.hasOwnProperty(key)) {
                changes[key] = {
                    action: 'removed',
                    value: before[key]
                };
                continue;
            }
            
            // Property only in after (added)
            if (!before.hasOwnProperty(key) && after.hasOwnProperty(key)) {
                changes[key] = {
                    action: 'added',
                    value: after[key]
                };
                continue;
            }
            
            // Both have property with different values (modified)
            if (typeof before[key] === 'object' && before[key] !== null &&
                typeof after[key] === 'object' && after[key] !== null) {
                // Recursive diff for objects
                const nestedChanges = this._getObjectDiff(before[key], after[key]);
                
                if (Object.keys(nestedChanges).length > 0) {
                    changes[key] = {
                        action: 'modified',
                        changes: nestedChanges
                    };
                }
            } else {
                // Simple value change
                changes[key] = {
                    action: 'modified',
                    from: before[key],
                    to: after[key]
                };
            }
        }
        
        return changes;
    }
    
    /**
     * Add snapshot change listener
     * @param {Function} callback - Function to call on snapshot change
     */
    onSnapshotChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.onSnapshotChange.push(callback);
        }
    }
    
    /**
     * Add error listener
     * @param {Function} callback - Function to call on error
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.listeners.onError.push(callback);
        }
    }
    
    /**
     * Notify snapshot change listeners
     * @param {string} phase - Before or after
     * @param {Object} snapshots - The snapshots
     * @private
     */
    _notifySnapshotChange(phase, snapshots) {
        this.listeners.onSnapshotChange.forEach(callback => {
            try {
                callback(phase, snapshots);
            } catch (error) {
                console.error('Error in snapshot change listener:', error);
            }
        });
    }
    
    /**
     * Notify error listeners
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @private
     */
    _notifyError(message, error) {
        this.listeners.onError.forEach(callback => {
            try {
                callback(message, error);
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }
}

export default DomainStateManager; 