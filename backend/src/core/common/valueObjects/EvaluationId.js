import { validate as uuidValidate } from "uuid";
import { EvaluationValidationError } from "#app/core/evaluation/errors/evaluationErrors.js";
'use strict';
/**
 * Evaluation ID Value Object
 */
class EvaluationId {
    /**
     * Create a new EvaluationId value object
     * @param {string} value - The evaluation ID value
     * @throws {EvaluationValidationError} If the value is empty or not a valid UUID
     */
    constructor(value) {
        if (!value) {
            throw new EvaluationValidationError('EvaluationId cannot be empty');
        }
        if (!EvaluationId.isValid(value)) {
            throw new EvaluationValidationError(`Invalid EvaluationId format: ${value}`);
        }
        this._value = value;
        this._isUuid = uuidValidate(value);
        Object.freeze(this);
    }
    /**
     * Get the evaluation ID value
     * @returns {string} Evaluation ID
     */
    get value() {
        return this._value;
    }
    /**
     * Check if the evaluation ID is in UUID format
     * @returns {boolean} True if ID is a UUID
     */
    get isUuid() {
        return this._isUuid;
    }
    /**
     * Check if two EvaluationId objects are equal
     * @param {EvaluationId} other - Another EvaluationId object to compare
     * @returns {boolean} True if IDs are equal
     */
    equals(other) {
        if (!(other instanceof EvaluationId)) {
            return false;
        }
        return this.value === other.value;
    }
    /**
     * Validate evaluation ID format
     * @param {string} evaluationId - Evaluation ID to validate
     * @returns {boolean} True if the ID format is valid
     */
    static isValid(evaluationId) {
        if (!evaluationId || typeof evaluationId !== 'string') {
            return false;
        }
        // UUID format
        if (uuidValidate(evaluationId)) {
            return true;
        }
        // Custom format: prefix-timestamp-number (e.g., eval-1624876543-123)
        const customFormatRegex = /^[a-zA-Z0-9]+(-[0-9]+-[0-9]+)$/;
        return customFormatRegex.test(evaluationId);
    }
    /**
     * Create an EvaluationId object from a string
     * @param {string} evaluationId - Evaluation ID string
     * @returns {EvaluationId|null} EvaluationId object or null if invalid
     */
    static create(evaluationId) {
        try {
            return new EvaluationId(evaluationId);
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
     * @returns {string} The evaluation ID value
     */
    toJSON() {
        return this._value;
    }
}
export default EvaluationId;
