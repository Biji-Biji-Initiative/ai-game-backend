import { v4 as uuidv4 } from "uuid";
import Challenge from "./Challenge.js";
import { ChallengeValidationError } from "../../challenge/errors/ChallengeErrors.js";
import { Email, ChallengeId, FocusArea, createEmail, createFocusArea } from "../../common/valueObjects/index.js";

/**
 * Factory for creating Challenge domain entities
 * 
 * This factory follows DDD principles by encapsulating the complex
 * logic of challenge creation and validation in a dedicated factory class
 * instead of in the entity or service.
 */
class ChallengeFactory {
    /**
     * Create a new challenge
     * 
     * @param {Object} data - Challenge data
     * @param {string|Email} [data.userEmail] - User email or Email value object
     * @param {string} [data.userId] - User ID
     * @param {string|FocusArea} [data.focusArea] - Focus area or FocusArea value object
     * @param {string} [data.challengeType] - Challenge type
     * @param {string} [data.formatType] - Format type
     * @param {string} [data.difficulty='intermediate'] - Difficulty level
     * @param {string} [data.title] - Challenge title
     * @param {string|Object} [data.content] - Challenge content
     * @param {string} [data.description] - Challenge description
     * @returns {Challenge} New challenge instance
     * @throws {ChallengeValidationError} If challenge data is invalid
     */
    static createChallenge(data = {}) {
        // Process and validate value objects
        let userEmailValue = null;
        let focusAreaValue = null;
        
        // Process Email value object if provided
        if (data.userEmail) {
            if (data.userEmail instanceof Email) {
                userEmailValue = data.userEmail.value;
            } else if (typeof data.userEmail === 'string') {
                const emailVO = createEmail(data.userEmail);
                if (!emailVO) {
                    throw new ChallengeValidationError(`Invalid email format: ${data.userEmail}`);
                }
                userEmailValue = emailVO.value;
            }
        }
        
        // Process FocusArea value object if provided
        if (data.focusArea) {
            if (data.focusArea instanceof FocusArea) {
                focusAreaValue = data.focusArea.value;
            } else if (typeof data.focusArea === 'string') {
                const focusAreaVO = createFocusArea(data.focusArea);
                if (!focusAreaVO) {
                    throw new ChallengeValidationError(`Invalid focus area: ${data.focusArea}`);
                }
                focusAreaValue = focusAreaVO.value;
            }
        }
        
        // Create challenge with default values
        const challengeData = {
            id: data.id || uuidv4(),
            userEmail: userEmailValue,
            userId: data.userId,
            focusArea: focusAreaValue,
            focusAreaId: data.focusAreaId,
            challengeType: data.challengeType,
            formatType: data.formatType,
            difficulty: data.difficulty || 'intermediate',
            status: data.status || 'pending',
            title: data.title || '',
            description: data.description || '',
            content: data.content || {},
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            typeMetadata: data.typeMetadata,
            formatMetadata: data.formatMetadata
        };
        
        return new Challenge(challengeData);
    }
    
    /**
     * Create a challenge from database record
     * 
     * @param {Object} dbRecord - Database record
     * @returns {Challenge} Challenge entity
     * @throws {ChallengeValidationError} If record is invalid
     */
    static createFromDatabase(dbRecord) {
        if (!dbRecord) {
            throw new ChallengeValidationError('Database record is required');
        }
        
        return new Challenge(dbRecord);
    }
    
    /**
     * Create a challenge from an existing challenge template
     * 
     * @param {Object} template - Challenge template
     * @param {Object} userInfo - User information
     * @param {string|Email} userInfo.email - User email or Email value object
     * @param {string} userInfo.userId - User ID
     * @returns {Challenge} New challenge instance based on template
     * @throws {ChallengeValidationError} If template or user info is invalid
     */
    static createFromTemplate(template, userInfo) {
        if (!template) {
            throw new ChallengeValidationError('Challenge template is required');
        }
        
        if (!userInfo || (!userInfo.email && !userInfo.userId)) {
            throw new ChallengeValidationError('User information is required');
        }
        
        const challengeData = {
            ...template,
            id: uuidv4(), // Always new ID for new challenge
            userEmail: userInfo.email,
            userId: userInfo.userId,
            status: 'pending', // Always start as pending
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return this.createChallenge(challengeData);
    }
}

export default ChallengeFactory; 