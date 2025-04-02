'use strict';
/**
 * FocusArea Value Object
 *
 * Represents and validates focus areas in the system.
 * Handles normalization and validation of focus area codes.
 * Follows Value Object pattern - immutable and defined by its value.
 *
 * This value object only validates the format of focus area codes.
 * Existence validation should be performed by services using
 * the FocusAreaConfigRepository as needed.
 */
/**
 * FocusArea Value Object
 */
import { ChallengeValidationError } from "#app/core/challenge/errors/ChallengeErrors.js";

class FocusArea {
    /**
     * Create a new FocusArea value object
     * @param {string} value - Focus area code or display name
     * @throws {ChallengeValidationError} If the focus area format is invalid
     */
    constructor(value) {
        if (!value) {
            throw new ChallengeValidationError('FocusArea cannot be empty');
        }
        // Basic format check - adjust as needed (e.g., allow spaces, specific characters)
        const formatRegex = /^[a-zA-Z0-9_\-]+$/;
        if (typeof value !== 'string' || !formatRegex.test(value)) {
            throw new ChallengeValidationError(`Invalid focus area format: ${value}`);
        }
        this._value = value;
        Object.freeze(this);
    }
    /**
     * Get the focus area code
     * @returns {string} Focus area code
     */
    get code() {
        return this._value;
    }
    /**
     * Get the display name for the focus area
     * @returns {string} Display name (same as code for base value object)
     */
    get displayName() {
        return this._value;
    }
    /**
     * Normalize a value to a focus area code
     * @param {string} value - Focus area value (code or display name)
     * @returns {string} Normalized focus area code
     * @private
     */
    normalizeToCode(value) {
        const strValue = String(value).trim();
        // Convert to standard format (snake_case)
        return strValue.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    }
    /**
     * Check if two FocusArea objects are equal
     * @param {FocusArea} other - Another FocusArea object to compare
     * @returns {boolean} True if areas are equal
     */
    equals(other) {
        if (!(other instanceof FocusArea)) {
            return false;
        }
        return this.code === other.code;
    }
    /**
     * Validate focus area code format
     * This only validates the format, not existence in the system
     * @param {string} code - Focus area code to validate
     * @returns {boolean} True if the code format is valid
     */
    static isValidFormat(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        // Focus area should be in snake_case format
        return /^[a-z][a-z0-9_]*$/.test(code);
    }
    /**
     * Create a FocusArea object from a string
     * @param {string} value - Focus area value
     * @returns {FocusArea|null} FocusArea object or null if invalid
     */
    static create(value) {
        try {
            return new FocusArea(value);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Convert to string representation (code)
     * @returns {string} String representation
     */
    toString() {
        return this._value;
    }
    /**
     * Convert to primitive value when serializing
     * @returns {string} The focus area code
     */
    toJSON() {
        return this._value;
    }
}
export default FocusArea;
