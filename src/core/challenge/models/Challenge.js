import { v4 as uuidv4 } from "uuid";
import { ChallengeValidationError } from "../errors/ChallengeErrors.js";
import { ChallengeSchema } from "../schemas/ChallengeSchema.js";
'use strict';
/**
 * @swagger
 * components:
 *   schemas:
 *     Challenge:
 *       type: object
 *       required:
 *         - id
 *         - content
 *         - userEmail
 *         - status
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the challenge
 *         content:
 *           type: string
 *           description: The challenge content/question
 *         userEmail:
 *           type: string
 *           format: email
 *           description: Email of the user the challenge is for
 *         focusArea:
 *           type: string
 *           description: The focus area of the challenge
 *         challengeType:
 *           type: string
 *           description: The type of challenge
 *         formatType:
 *           type: string
 *           description: The format of the challenge
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           description: Difficulty level of the challenge
 *         status:
 *           type: string
 *           enum: [pending, submitted, evaluated]
 *           description: Current status of the challenge
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the challenge was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the challenge was last updated
 *
 *     ChallengeResponse:
 *       type: object
 *       required:
 *         - id
 *         - challengeId
 *         - userEmail
 *         - response
 *         - submittedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the response
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge being responded to
 *         userEmail:
 *           type: string
 *           format: email
 *           description: Email of the user submitting the response
 *         response:
 *           type: string
 *           description: The user's response to the challenge
 *         evaluationId:
 *           type: string
 *           format: uuid
 *           description: ID of the evaluation for this response, if any
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When the response was submitted
 *
 *     Error:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           default: false
 *         message:
 *           type: string
 *           description: Error message
 *         errorCode:
 *           type: string
 *           description: Error code for client-side error handling
 *         details:
 *           type: object
 *           description: Additional error details
 */
/**
 * Challenge domain entity
 */
class Challenge {
    /**
     * Create a new Challenge instance
     * @param {Object} data - Challenge data
     * @param {string} data.title - Title of the challenge
     * @param {Object|string} data.content - The challenge content/question
     * @param {string} [data.userEmail] - Email of the user the challenge is for
     * @param {string} [data.userId] - ID of the user the challenge is for
     * @param {string} [data.focusArea] - Focus area of the challenge
     * @param {string} [data.challengeType] - Type of challenge
     * @param {string} [data.formatType] - Format type of the challenge
     * @param {string} [data.difficulty] - Difficulty level of the challenge
     * @param {string} [data.status='pending'] - Status of the challenge
     * @param {Date|string} [data.createdAt] - When the challenge was created
     * @param {Date|string} [data.updatedAt] - When the challenge was last updated
     * @throws {ChallengeValidationError} When required fields are missing or validation fails
     */
    constructor({ id, content, userEmail, userId, focusArea, focusAreaId, challengeType, formatType, difficulty, status = 'pending', createdAt = new Date(), updatedAt = new Date(), responses = [], evaluation = null, score = 0, title = '', description = '', instructions = '', evaluationCriteria = [] }) {
        // Create a data object to validate
        const challengeData = {
            id: id || uuidv4(),
            title,
            description,
            content: typeof content === 'string' ? { instructions: content } : content,
            userEmail,
            userId,
            focusArea,
            focusAreaId,
            challengeType,
            formatType,
            difficulty,
            status,
            responses,
            evaluation,
            score,
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
            updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
            evaluationCriteria
        };
        
        // Validate with Zod schema
        const validationResult = ChallengeSchema.safeParse(challengeData);
        
        if (!validationResult.success) {
            throw new ChallengeValidationError(
                `Challenge validation failed: ${validationResult.error.message}`,
                { validationErrors: validationResult.error.flatten() }
            );
        }
        
        // Assign properties from validated data
        const validData = validationResult.data;
        
        this.id = validData.id;
        this.content = validData.content;
        this.userEmail = validData.userEmail;
        this.userId = validData.userId;
        this.focusArea = validData.focusArea;
        this.focusAreaId = validData.focusAreaId;
        this.challengeType = validData.challengeType;
        this.formatType = validData.formatType;
        this.difficulty = validData.difficulty;
        this.status = validData.status;
        this.title = validData.title;
        this.description = validData.description;
        this.evaluationCriteria = validData.evaluationCriteria;
        this.responses = validData.responses || [];
        this.evaluation = validData.evaluation;
        this.score = validData.score || 0;
        
        // Handle date formats - convert ISO strings back to Date objects
        this.createdAt = new Date(validData.createdAt);
        this.updatedAt = new Date(validData.updatedAt);
        
        // Domain events collection to track events raised by this entity
        this._domainEvents = [];
    }
    /**
     * Generate a new UUID for a challenge
     * @returns {string} A new UUID v4
     * @static
     */
    static createNewId() {
        return uuidv4();
    }
    /**
     * Update the challenge status
     * @param {string} newStatus - New status for the challenge
     * @returns {void}
     */
    updateStatus(newStatus) {
        if (this.status === newStatus) {
            return;
        }
        // Could add validation of status transitions here
        const previousStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date();
        // Add domain event for status change
        this.addDomainEvent('CHALLENGE_STATUS_CHANGED', {
            challengeId: this.id,
            previousStatus,
            newStatus,
        });
    }
    /**
     * Check if challenge is completed
     * @returns {boolean} True if challenge is completed
     */
    isCompleted() {
        return this.status === 'evaluated' || this.status === 'completed';
    }
    /**
     * Submit responses to the challenge
     * @param {Array} responses - Array of response objects
     */
    submitResponses(responses) {
        if (!Array.isArray(responses)) {
            responses = [responses];
        }
        this.responses = this.responses || [];
        this.responses = [...this.responses, ...responses];
        this.updateStatus('submitted');
        this.updatedAt = new Date();
        this.addDomainEvent('CHALLENGE_RESPONSES_SUBMITTED', {
            challengeId: this.id,
            responseCount: this.responses.length
        });
    }
    /**
     * Complete the challenge with evaluation
     * @param {Object} evaluation - Challenge evaluation
     */
    complete(evaluation) {
        this.evaluation = evaluation;
        this.score = evaluation.score || 0;
        this.updateStatus('evaluated');
        this.updatedAt = new Date();
        this.addDomainEvent('CHALLENGE_COMPLETED', {
            challengeId: this.id,
            score: this.score
        });
    }
    /**
     * Get the challenge score
     * @returns {number} Challenge score
     */
    getScore() {
        return this.score || 0;
    }
    /**
     * Add a domain event
     * @param {string} eventType - Type of the event
     * @param {Object} eventData - Event data
     */
    addDomainEvent(eventType, eventData) {
        if (!this._domainEvents) {
            this._domainEvents = [];
        }
        this._domainEvents.push({
            eventType,
            eventData,
            timestamp: new Date(),
        });
    }
    /**
     * Get all domain events
     * @returns {Array} Collection of domain events
     */
    getDomainEvents() {
        return this._domainEvents || [];
    }
    /**
     * Clear all domain events
     */
    clearDomainEvents() {
        this._domainEvents = [];
    }
    /**
     * Convert to a plain object for serialization
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            content: this.content,
            userEmail: this.userEmail,
            userId: this.userId,
            focusArea: this.focusArea,
            focusAreaId: this.focusAreaId,
            challengeType: this.challengeType,
            formatType: this.formatType,
            difficulty: this.difficulty,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            title: this.title,
            description: this.description,
            instructions: this.instructions,
            evaluationCriteria: this.evaluationCriteria,
            responses: this.responses,
            evaluation: this.evaluation,
            score: this.score
        };
    }
    /**
     * Update challenge with new data
     * @param {Object} updateData - Data to update
     * @returns {Challenge} Updated challenge instance
     * @throws {ChallengeValidationError} When validation fails
     */
    update(updateData) {
        // Create a new instance with updated data
        const updated = {
            ...this.toJSON(),
            ...updateData,
            updatedAt: new Date(),
        };
        
        // Validate with Zod schema
        const validationResult = ChallengeSchema.safeParse(updated);
        
        if (!validationResult.success) {
            throw new ChallengeValidationError(
                `Challenge update validation failed: ${validationResult.error.message}`,
                { validationErrors: validationResult.error.flatten() }
            );
        }
        
        return new Challenge(updated);
    }
    /**
     * Validate the current challenge data against the schema
     * @returns {boolean} True if valid
     * @throws {ChallengeValidationError} When validation fails
     */
    validate() {
        const validationResult = ChallengeSchema.safeParse(this.toJSON());
        
        if (!validationResult.success) {
            throw new ChallengeValidationError(
                `Challenge validation failed: ${validationResult.error.message}`,
                { validationErrors: validationResult.error.flatten() }
            );
        }
        
        return true;
    }
}
export default Challenge;
