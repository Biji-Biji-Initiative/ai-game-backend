import { validate as uuidValidate } from "uuid";
import { ChallengeValidationError } from "#app/core/challenge/errors/ChallengeErrors.js";
'use strict';
/**
 * Challenge ID Value Object
 */
class ChallengeId {
    /**
     * Create a new ChallengeId value object
     * @param {string} value - The challenge ID value
     * @throws {ChallengeValidationError} If the value is empty or not a valid UUID
     */
    constructor(value) {
        if (!value) {
            throw new ChallengeValidationError('ChallengeId cannot be empty');
        }
        if (!ChallengeId.isValid(value)) {
            throw new ChallengeValidationError(`Invalid ChallengeId format: ${value}`);
        }
        this._value = value;
        this._isUuid = uuidValidate(value);
        Object.freeze(this);
    }
    /**
     * Get the challenge ID value
     * @returns {string} Challenge ID
     */
    get value() {
        return this._value;
    }
    /**
     * Check if the challenge ID is in UUID format
     * @returns {boolean} True if ID is a UUID
     */
    get isUuid() {
        return this._isUuid;
    }
    /**
     * Check if two ChallengeId objects are equal
     * @param {ChallengeId} other - Another ChallengeId object to compare
     * @returns {boolean} True if IDs are equal
     */
    equals(other) {
        if (!(other instanceof ChallengeId)) {
            return false;
        }
        return this.value === other.value;
    }
    /**
     * Validate challenge ID format
     * @param {string} challengeId - Challenge ID to validate
     * @returns {boolean} True if the ID format is valid
     */
    static isValid(challengeId) {
        if (!challengeId || typeof challengeId !== 'string') {
            return false;
        }
        // UUID format
        if (uuidValidate(challengeId)) {
            return true;
        }
        // Custom format: prefix-timestamp-number (e.g., user1-1624876543-123)
        const customFormatRegex = /^[a-zA-Z0-9]+(-[0-9]+-[0-9]+)$/;
        return customFormatRegex.test(challengeId);
    }
    /**
     * Create a ChallengeId object from a string
     * @param {string} challengeId - Challenge ID string
     * @returns {ChallengeId|null} ChallengeId object or null if invalid
     */
    static create(challengeId) {
        try {
            return new ChallengeId(challengeId);
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
     * @returns {string} The challenge ID value
     */
    toJSON() {
        return this._value;
    }
}
export default ChallengeId;
