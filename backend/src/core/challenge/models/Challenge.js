import { v4 as uuidv4 } from "uuid";
import { ChallengeValidationError } from "#app/core/challenge/errors/ChallengeErrors.js";
import { ChallengeSchema } from "#app/core/challenge/schemas/ChallengeSchema.js";
import { Email, ChallengeId, FocusArea, DifficultyLevel, createEmail, createChallengeId, createFocusArea, createDifficultyLevel } from "#app/core/common/valueObjects/index.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
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
     * @param {Object} options - Additional options
     * @param {Object} options.EventTypes - Event type constants
     * @param {string} data.title - Title of the challenge
     * @param {Object|string} data.content - The challenge content/question
     * @param {string|Email} [data.userEmail] - Email of the user the challenge is for
     * @param {string} [data.userId] - ID of the user the challenge is for
     * @param {string|FocusArea} [data.focusArea] - Focus area of the challenge
     * @param {string} [data.challengeType] - Type of challenge
     * @param {string} [data.formatType] - Format type of the challenge
     * @param {string|DifficultyLevel} [data.difficulty] - Difficulty level of the challenge
     * @param {string} [data.status='pending'] - Status of the challenge
     * @param {Date|string} [data.createdAt] - When the challenge was created
     * @param {Date|string} [data.updatedAt] - When the challenge was last updated
     * @throws {ChallengeValidationError} When required fields are missing or validation fails
     */
    constructor(data = {}, options = {}) {
        this.id = data.id || uuidv4();
        this.userId = data.userId;
        this.name = data.name;
        this.description = data.description || '';
        this.type = data.type;
        this.status = data.status || 'pending';
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this._domainEvents = [];
        
        // Store EventTypes from options
        this.EventTypes = options.EventTypes || EventTypes;
        
        // Convert id to ChallengeId value object if needed
        this._idVO = data.id ? (data.id instanceof ChallengeId ? data.id : createChallengeId(data.id || uuidv4())) : createChallengeId(uuidv4());
        if (!this._idVO) {
            throw new ChallengeValidationError('Invalid challenge ID format');
        }
        
        // Convert userEmail to Email value object if provided and not already a VO
        this._emailVO = null;
        if (data.userEmail) {
            this._emailVO = data.userEmail instanceof Email ? data.userEmail : createEmail(data.userEmail);
            if (!this._emailVO) {
                throw new ChallengeValidationError('Invalid email format');
            }
        }
        
        // Convert focusArea to FocusArea value object if needed
        this._focusAreaVO = null;
        if (data.focusArea) {
            this._focusAreaVO = data.focusArea instanceof FocusArea ? data.focusArea : createFocusArea(data.focusArea);
            if (!this._focusAreaVO) {
                throw new ChallengeValidationError('Invalid focus area format');
            }
        }
        
        // Convert difficulty to DifficultyLevel value object if needed
        this._difficultyVO = null;
        if (data.difficulty) {
            this._difficultyVO = data.difficulty instanceof DifficultyLevel ? data.difficulty : createDifficultyLevel(data.difficulty);
            if (!this._difficultyVO) {
                throw new ChallengeValidationError('Invalid difficulty level');
            }
        }
        
        // Create a data object to validate
        const challengeData = {
            id: this._idVO.value,
            title: data.title,
            description: this.description,
            content: typeof data.content === 'string' ? { instructions: data.content } : data.content,
            userEmail: this._emailVO ? this._emailVO.value : data.userEmail,
            userId: this.userId,
            focusArea: this._focusAreaVO ? this._focusAreaVO.value : data.focusArea,
            focusAreaId: data.focusAreaId,
            challengeType: data.challengeType,
            formatType: data.formatType,
            difficulty: this._difficultyVO ? this._difficultyVO.value : data.difficulty,
            status: this.status,
            responses: data.responses || [],
            evaluation: data.evaluation,
            score: data.score || 0,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            evaluationCriteria: data.evaluationCriteria || []
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
    }
    /**
     * Get the challenge ID as a value object
     * @returns {ChallengeId} Challenge ID value object
     */
    get challengeIdVO() {
        return this._idVO;
    }
    /**
     * Get the user email as a value object
     * @returns {Email|null} Email value object or null if not set
     */
    get emailVO() {
        return this._emailVO;
    }
    /**
     * Get the focus area as a value object
     * @returns {FocusArea|null} FocusArea value object or null if not set
     */
    get focusAreaVO() {
        return this._focusAreaVO;
    }
    /**
     * Get the difficulty level as a value object
     * @returns {DifficultyLevel|null} DifficultyLevel value object or null if not set
     */
    get difficultyVO() {
        return this._difficultyVO;
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
     * @param {string} eventType - Type of the event from EventTypes
     * @param {Object} eventData - Event data
     */
    addDomainEvent(eventType, eventData = {}) {
        if (!this._domainEvents) {
            this._domainEvents = [];
        }

        // Create standardized event structure
        const event = {
            type: eventType,
            data: {
                ...eventData,
                entityId: this.id,
                entityType: 'Challenge'
            },
            metadata: {
                timestamp: new Date().toISOString(),
                correlationId: `challenge-${this.id}-${Date.now()}`
            }
        };
        
        this._domainEvents.push(event);
    }
    /**
     * Get all domain events
     * @returns {Array} Array of domain events
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
        // Convert value objects in the update data if necessary
        if (updateData.userEmail && !(updateData.userEmail instanceof Email)) {
            const emailVO = createEmail(updateData.userEmail);
            if (!emailVO) {
                throw new ChallengeValidationError('Invalid email format in update data');
            }
            updateData.userEmail = emailVO.value;
        }
        
        if (updateData.focusArea && !(updateData.focusArea instanceof FocusArea)) {
            const focusAreaVO = createFocusArea(updateData.focusArea);
            if (!focusAreaVO) {
                throw new ChallengeValidationError('Invalid focus area in update data');
            }
            updateData.focusArea = focusAreaVO.value;
        }
        
        if (updateData.difficulty && !(updateData.difficulty instanceof DifficultyLevel)) {
            const difficultyVO = createDifficultyLevel(updateData.difficulty);
            if (!difficultyVO) {
                throw new ChallengeValidationError('Invalid difficulty level in update data');
            }
            updateData.difficulty = difficultyVO.value;
        }
        
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
