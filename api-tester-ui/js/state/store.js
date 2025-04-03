/**
 * State Store - A centralized state management system using pub/sub pattern
 * This module provides a way to manage application state with subscription notifications
 */

class StateStore {
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._listeners = {};
        this._snapshots = [];
        this._snapshotIndex = -1;
        this._maxSnapshots = 50;
    }

    /**
     * Get the current state or a specific part of the state
     * @param {string} [path] - Optional dot notation path (e.g., "auth.user")
     * @returns {any} The requested state
     */
    getState(path) {
        if (!path) {
            return { ...this._state };
        }

        return this._getNestedValue(this._state, path);
    }

    /**
     * Update the state
     * @param {Object|Function} updater - Either an object to merge or a function that receives current state
     * @param {string} [description] - Optional description of this update for debugging
     */
    setState(updater, description = "State update") {
        const prevState = { ...this._state };
        
        if (typeof updater === "function") {
            this._state = { ...this._state, ...updater(this._state) };
        } else if (typeof updater === "object") {
            this._state = { ...this._state, ...updater };
        } else {
            throw new Error("setState requires an object or function");
        }

        // Take a snapshot for undo/debugging
        this._addSnapshot(prevState, description);
        
        // Notify all listeners
        this._notifyListeners(prevState);
    }

    /**
     * Subscribe to state changes
     * @param {string} key - Unique identifier for this subscription
     * @param {Function} callback - Function to call when state changes
     * @param {string} [path] - Optional path to watch for changes specifically
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback, path) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }

        const listener = { callback, path };
        this._listeners[key].push(listener);

        // Return unsubscribe function
        return () => {
            this._listeners[key] = this._listeners[key].filter(l => l !== listener);
            if (this._listeners[key].length === 0) {
                delete this._listeners[key];
            }
        };
    }

    /**
     * Reset the state to initial values
     * @param {Object} [initialState] - Optional new initial state
     */
    resetState(initialState = {}) {
        const prevState = { ...this._state };
        this._state = { ...initialState };
        this._addSnapshot(prevState, "State reset");
        this._notifyListeners(prevState);
    }

    /**
     * Undo the last state change
     * @returns {boolean} Whether the undo was successful
     */
    undo() {
        if (this._snapshotIndex <= 0) {
            return false;
        }

        this._snapshotIndex--;
        const prevState = { ...this._state };
        this._state = { ...this._snapshots[this._snapshotIndex].state };
        this._notifyListeners(prevState);
        return true;
    }

    /**
     * Redo a previously undone state change
     * @returns {boolean} Whether the redo was successful
     */
    redo() {
        if (this._snapshotIndex >= this._snapshots.length - 1) {
            return false;
        }

        this._snapshotIndex++;
        const prevState = { ...this._state };
        this._state = { ...this._snapshots[this._snapshotIndex].state };
        this._notifyListeners(prevState);
        return true;
    }

    /**
     * Get the history of state changes
     * @returns {Array} Array of state snapshots with timestamps and descriptions
     */
    getHistory() {
        return [...this._snapshots];
    }

    // Private methods

    /**
     * Add a snapshot to the history
     * @private
     */
    _addSnapshot(state, description) {
        // Remove any future snapshots if we're in the middle of history
        if (this._snapshotIndex < this._snapshots.length - 1) {
            this._snapshots = this._snapshots.slice(0, this._snapshotIndex + 1);
        }

        // Add the new snapshot
        this._snapshots.push({
            state: { ...state },
            timestamp: new Date(),
            description
        });

        // Limit the number of snapshots
        if (this._snapshots.length > this._maxSnapshots) {
            this._snapshots.shift();
        } else {
            this._snapshotIndex++;
        }
    }

    /**
     * Notify all listeners of state changes
     * @private
     */
    _notifyListeners(prevState) {
        Object.keys(this._listeners).forEach(key => {
            this._listeners[key].forEach(listener => {
                if (listener.path) {
                    const oldValue = this._getNestedValue(prevState, listener.path);
                    const newValue = this._getNestedValue(this._state, listener.path);
                    
                    // Only notify if this specific path changed
                    if (!this._isEqual(oldValue, newValue)) {
                        listener.callback(this._state, prevState);
                    }
                } else {
                    // No path specified, always notify
                    listener.callback(this._state, prevState);
                }
            });
        });
    }

    /**
     * Get a nested value from an object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        const keys = path.split(".");
        return keys.reduce((acc, key) => {
            return (acc && typeof acc === "object") ? acc[key] : undefined;
        }, obj);
    }

    /**
     * Simple deep equality check for primitive values and objects
     * @private
     */
    _isEqual(a, b) {
        if (a === b) return true;
        
        if (a === null || b === null) return false;
        
        if (typeof a !== typeof b) return false;
        
        if (typeof a === "object") {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            return keysA.every(key => this._isEqual(a[key], b[key]));
        }
        
        return false;
    }
}

export default StateStore; 