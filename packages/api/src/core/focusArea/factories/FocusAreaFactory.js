/**
 * Focus Area Factory
 * 
 * Factory for creating FocusArea domain entities with consistent validation
 * and encapsulated creation logic following the Factory Pattern.
 * 
 * @module FocusAreaFactory
 */

import { v4 as uuidv4 } from "uuid";
import FocusArea from "../models/FocusArea.js";
import { focusAreaSchema, validate } from "../schemas/focusAreaValidation.js";
import { FocusAreaError } from "../errors/focusAreaErrors.js";

'use strict';

/**
 * Creates a new FocusArea entity from AI-generated content
 * 
 * @param {string} userId - User ID that owns this focus area
 * @param {Object} areaData - Data for the focus area from AI generation
 * @param {string} areaData.name - Name/title of the focus area
 * @param {string} areaData.description - Description of the focus area
 * @param {number|string} areaData.priorityLevel - Priority level (high/medium/low or 1-3)
 * @param {Object} areaData.metadata - Additional metadata about the focus area
 * @param {string} [responseId] - Response ID from the AI system for traceability
 * @returns {FocusArea} A new FocusArea domain entity
 * @throws {FocusAreaError} If validation fails
 */
function createFromAIGeneration(userId, areaData, responseId = null) {
    try {
        if (!userId) {
            throw new FocusAreaError('User ID is required to create a focus area', 400);
        }

        if (!areaData || typeof areaData !== 'object') {
            throw new FocusAreaError('Valid focus area data is required', 400);
        }

        // Convert priority from high/medium/low text format to numeric value if needed
        let priorityLevel = 1;
        if (typeof areaData.priorityLevel === 'string') {
            priorityLevel = areaData.priorityLevel === 'high' ? 1 :
                            areaData.priorityLevel === 'medium' ? 2 : 3;
        } else if (typeof areaData.priorityLevel === 'number') {
            priorityLevel = areaData.priorityLevel;
        }

        // Prepare metadata with AI response information
        const metadata = {
            ...(areaData.metadata || {}),
            responseId: responseId || areaData.responseId || null,
            rationale: areaData.rationale || null,
            improvementStrategies: Array.isArray(areaData.improvementStrategies) 
                                  ? areaData.improvementStrategies 
                                  : [],
            recommendedChallengeTypes: Array.isArray(areaData.recommendedChallengeTypes) 
                                     ? areaData.recommendedChallengeTypes 
                                     : []
        };

        // Create a new FocusArea instance with validated data
        return new FocusArea({
            id: uuidv4(), // Generate a new UUID
            userId,
            name: areaData.name,
            description: areaData.description || '',
            priority: priorityLevel,
            active: true,
            metadata
        });
    } catch (error) {
        // Catch and rethrow validation errors as FocusAreaError
        if (error instanceof FocusAreaError) {
            throw error;
        }
        throw new FocusAreaError(`Failed to create focus area: ${error.message}`, 400, { cause: error });
    }
}

/**
 * Creates a FocusArea entity from database/persistence layer data
 * 
 * @param {Object} dbRecord - Database record for a focus area
 * @returns {FocusArea} A FocusArea domain entity
 * @throws {FocusAreaError} If validation fails
 */
function createFromDatabase(dbRecord) {
    try {
        if (!dbRecord || typeof dbRecord !== 'object') {
            throw new FocusAreaError('Valid database record is required', 400);
        }

        return new FocusArea({
            id: dbRecord.id,
            userId: dbRecord.user_id || dbRecord.userId,
            name: dbRecord.name,
            description: dbRecord.description || '',
            active: dbRecord.active === undefined ? true : dbRecord.active,
            priority: dbRecord.priority || 1,
            metadata: dbRecord.metadata || {},
        });
    } catch (error) {
        // Catch and rethrow validation errors as FocusAreaError
        if (error instanceof FocusAreaError) {
            throw error;
        }
        throw new FocusAreaError(`Failed to create focus area from database: ${error.message}`, 400, { cause: error });
    }
}

/**
 * Creates a collection of FocusArea entities from AI-generated data
 * 
 * @param {string} userId - User ID that owns these focus areas
 * @param {Array} areaDataArray - Array of focus area data from AI generation
 * @param {string} [responseId] - Response ID from the AI system
 * @returns {Array<FocusArea>} Array of FocusArea domain entities
 * @throws {FocusAreaError} If validation fails
 */
function createCollectionFromAIGeneration(userId, areaDataArray, responseId = null) {
    if (!Array.isArray(areaDataArray)) {
        throw new FocusAreaError('Focus area data must be an array', 400);
    }

    return areaDataArray.map(areaData => createFromAIGeneration(userId, areaData, responseId));
}

export {
    createFromAIGeneration,
    createFromDatabase,
    createCollectionFromAIGeneration
};

export default {
    createFromAIGeneration,
    createFromDatabase,
    createCollectionFromAIGeneration
}; 