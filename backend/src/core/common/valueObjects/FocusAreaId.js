import { validate as uuidValidate } from "uuid";
import { FocusAreaValidationError } from "#app/core/focusArea/errors/focusAreaErrors.js";
'use strict';
/**
 * Focus Area ID Value Object
 */
class FocusAreaId {
    /**
     * Create a new FocusAreaId value object
     * @param {string} value - The focus area ID value
     * @throws {FocusAreaValidationError} If the value is empty or not a valid UUID
     */
    constructor(value) {
        if (!value) {
            throw new FocusAreaValidationError('FocusAreaId cannot be empty');
        }
        if (!FocusAreaId.isValid(value)) {
            throw new FocusAreaValidationError(`Invalid FocusAreaId format: ${value}`);
        }
        this._value = value;
        this._isUuid = uuidValidate(value);
        Object.freeze(this);
    }
    /**
     * Get the focus area ID value
     * @returns {string} Focus Area ID
     */
    get value() {
        return this._value;
    }
    /**
     * Check if the focus area ID is in UUID format
     * @returns {boolean} True if ID is a UUID
     */
    get isUuid() {
        return this._isUuid;
    }
    /**
     * Check if two FocusAreaId objects are equal
     * @param {FocusAreaId} other - Another FocusAreaId object to compare
     * @returns {boolean} True if IDs are equal
     */
    equals(other) {
        if (!(other instanceof FocusAreaId)) {
            return false;
        }
        return this.value === other.value;
    }
    /**
     * Validate focus area ID format
     * @param {string} focusAreaId - Focus Area ID to validate
     * @returns {boolean} True if the ID format is valid
     */
    static isValid(focusAreaId) {
        if (!focusAreaId || typeof focusAreaId !== 'string') {
            return false;
        }
        // UUID format
        if (uuidValidate(focusAreaId)) {
            return true;
        }
        // Custom format: prefix-timestamp-number (e.g., focus-1624876543-123)
        const customFormatRegex = /^[a-zA-Z0-9]+(-[0-9]+-[0-9]+)$/;
        return customFormatRegex.test(focusAreaId);
    }
    /**
     * Create a FocusAreaId object from a string
     * @param {string} focusAreaId - Focus Area ID string
     * @returns {FocusAreaId|null} FocusAreaId object or null if invalid
     */
    static create(focusAreaId) {
        try {
            return new FocusAreaId(focusAreaId);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Convert to string representation
     * @returns {string} String representation
     */
    toString() {
        return this._value;
    }
    /**
     * Convert to primitive value when serializing
     * @returns {string} The focus area ID value
     */
    toJSON() {
        return this._value;
    }
}
export default FocusAreaId; 