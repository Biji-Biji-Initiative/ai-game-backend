import BaseCoordinator from "./BaseCoordinator.js";
import { 
    TECH_THRESHOLDS, 
    ATTITUDE_THRESHOLD, 
    DEFAULT_ATTITUDE_VALUE,
    DETAIL_LEVEL,
    COMMUNICATION_STYLE,
    RESPONSE_FORMAT
} from "../core/personality/config/attitudeMappingConfig.js";
import {
    UserId,
    createUserId,
    ensureVO
} from "../core/common/valueObjects/index.js";
import personalityErrors from '../core/personality/errors/PersonalityErrors.js';

const { 
    PersonalityError, 
    PersonalityNotFoundError, 
    PersonalityValidationError, 
    PersonalityProcessingError 
} = personalityErrors;

'use strict';
/**
 * Class representing Personality Coordinator
 * Extends BaseCoordinator for standardized error handling and operation execution
 */
class PersonalityCoordinator extends BaseCoordinator {
    /**
     * Create a personality coordinator
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.userService - User domain service
     * @param {Object} dependencies.personalityDataLoader - Personality data loader with caching
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies) {
        // Call super with name and logger
        super({
            name: 'PersonalityCoordinator',
            logger: dependencies?.logger
        });
        // Validate required dependencies
        const requiredDependencies = [
            'userService',
            'personalityDataLoader'
        ];
        // Check that dependencies contains all required dependencies
        for (const dep of requiredDependencies) {
            if (!dependencies[dep]) {
                throw new Error(`${dep} is required for PersonalityCoordinator`);
            }
        }
        // Initialize services
        this.userService = dependencies.userService;
        this.dataLoader = dependencies.personalityDataLoader;
    }
    /**
     * Synchronize a user's preferences based on personality AI attitudes
     * This is a cross-domain operation that translates personality domain data to user domain data
     *
     * @param {string|UserId} userId - User ID or UserId value object
     * @returns {Promise<Object>} Updated user preferences
     * @throws {PersonalityValidationError} If userId is invalid
     * @throws {PersonalityNotFoundError} If user is not found
     * @throws {PersonalityProcessingError} If an error occurs during synchronization
     * @throws {PersonalityError} If any other personality-related error occurs
     */
    synchronizeUserPreferences(userId) {
        return this.executeOperation(async () => {
            // Convert to value object if needed using the standardized pattern
            const userIdVO = ensureVO(userId, UserId, createUserId);
            
            // Validate value object
            if (!userIdVO) {
                throw new PersonalityValidationError(`Invalid user ID: ${userId}`);
            }
            
            // Get user from user domain using the value object
            const user = await this.userService.getUserById(userIdVO);
            if (!user) {
                throw new PersonalityNotFoundError(`User not found for preferences synchronization: ${userIdVO.value}`);
            }
            
            // Get AI attitudes using the data loader (cached)
            const aiAttitudes = await this.dataLoader.getAiAttitudes(userIdVO.value);
            if (!aiAttitudes || Object.keys(aiAttitudes).length === 0) {
                this.logger.info('No AI attitudes found for user, using defaults', { userId: userIdVO.value });
                // Continue with default attitudes
            }
            
            // Map attitudes to preferences (pure function, no domain knowledge)
            const aiPreferences = this._mapAttitudesToPreferences(aiAttitudes);
            
            // Update user preferences through user domain model
            this.logger.debug('Updating user AI preferences', {
                userId: userIdVO.value,
                aiPreferences: Object.keys(aiPreferences)
            });
            
            // Use the dedicated domain model method to update preferences
            user.updateAIPreferences(aiPreferences);
            
            try {
                // Use a specific method to update only the AI preferences
                // This prevents overwriting other unrelated preferences
                await this.userService.updateUserAIPreferences(userIdVO, aiPreferences);
            } catch (error) {
                throw new PersonalityProcessingError(`Failed to update user AI preferences: ${error.message}`, { cause: error });
            }
            
            return user.preferences;
        }, 'synchronizeUserPreferences', { 
            userId: typeof userId === 'string' ? userId : userId?.value 
        }, PersonalityError);
    }
    
    /**
     * Get AI attitudes for a user (cached)
     * @param {string|UserId} userId - User ID or UserId value object
     * @returns {Promise<Object>} AI attitudes
     * @throws {PersonalityValidationError} If userId is invalid
     * @throws {PersonalityNotFoundError} If user is not found
     * @throws {PersonalityProcessingError} If an error occurs during retrieval
     * @throws {PersonalityError} If any other personality-related error occurs
     */
    getAiAttitudes(userId) {
        return this.executeOperation(async () => {
            // Convert to value object if needed
            const userIdVO = ensureVO(userId, UserId, createUserId);
            
            // Validate value object
            if (!userIdVO) {
                throw new PersonalityValidationError(`Invalid user ID: ${userId}`);
            }
            
            try {
                const attitudes = await this.dataLoader.getAiAttitudes(userIdVO.value);
                if (!attitudes) {
                    throw new PersonalityNotFoundError(`No AI attitudes found for user: ${userIdVO.value}`);
                }
                return attitudes;
            } catch (error) {
                if (error instanceof PersonalityError) {
                    throw error;
                }
                throw new PersonalityProcessingError(`Failed to retrieve AI attitudes: ${error.message}`, { cause: error });
            }
        }, 'getAiAttitudes', { 
            userId: typeof userId === 'string' ? userId : userId?.value 
        }, PersonalityError);
    }
    
    /**
     * Get personality traits for a user (cached)
     * @param {string|UserId} userId - User ID or UserId value object
     * @returns {Promise<Object>} Personality traits
     * @throws {PersonalityValidationError} If userId is invalid
     * @throws {PersonalityNotFoundError} If user is not found
     * @throws {PersonalityProcessingError} If an error occurs during retrieval
     * @throws {PersonalityError} If any other personality-related error occurs
     */
    getPersonalityTraits(userId) {
        return this.executeOperation(async () => {
            // Convert to value object if needed
            const userIdVO = ensureVO(userId, UserId, createUserId);
            
            // Validate value object
            if (!userIdVO) {
                throw new PersonalityValidationError(`Invalid user ID: ${userId}`);
            }
            
            try {
                const traits = await this.dataLoader.getPersonalityTraits(userIdVO.value);
                if (!traits) {
                    throw new PersonalityNotFoundError(`No personality traits found for user: ${userIdVO.value}`);
                }
                return traits;
            } catch (error) {
                if (error instanceof PersonalityError) {
                    throw error;
                }
                throw new PersonalityProcessingError(`Failed to retrieve personality traits: ${error.message}`, { cause: error });
            }
        }, 'getPersonalityTraits', { 
            userId: typeof userId === 'string' ? userId : userId?.value 
        }, PersonalityError);
    }
    
    /**
     * Map AI attitudes to user preferences
     * Pure mapping function with no domain knowledge or side effects
     *
     * @param {Object} aiAttitudes - AI attitudes from personality domain
     * @returns {Object} User preferences
     * @private
     */
    _mapAttitudesToPreferences(aiAttitudes) {
        // Set detail level based on tech_savvy and early_adopter scores
        const techSum = (aiAttitudes?.tech_savvy || DEFAULT_ATTITUDE_VALUE) + 
                        (aiAttitudes?.early_adopter || DEFAULT_ATTITUDE_VALUE);
        
        let detailLevel = DETAIL_LEVEL.DETAILED;
        if (techSum > TECH_THRESHOLDS.HIGH) {
            detailLevel = DETAIL_LEVEL.COMPREHENSIVE;
        }
        else if (techSum < TECH_THRESHOLDS.LOW) {
            detailLevel = DETAIL_LEVEL.BASIC;
        }
        
        // Set communication style based on attitudes
        let communicationStyle = COMMUNICATION_STYLE.CASUAL;
        if (aiAttitudes?.security_conscious && 
            aiAttitudes.security_conscious > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.FORMAL;
        }
        else if (aiAttitudes?.experimental && 
                aiAttitudes.experimental > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.CASUAL;
        }
        else if (aiAttitudes?.ethical_concern && 
                aiAttitudes.ethical_concern > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.TECHNICAL;
        }
        
        // Set response format preferences
        let responseFormat = RESPONSE_FORMAT.MIXED;
        if (aiAttitudes?.skeptical && 
            aiAttitudes.skeptical > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            responseFormat = RESPONSE_FORMAT.STRUCTURED;
        }
        else if (aiAttitudes?.early_adopter && 
                aiAttitudes.early_adopter > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            responseFormat = RESPONSE_FORMAT.CONVERSATIONAL;
        }
        
        return {
            detailLevel,
            communicationStyle,
            responseFormat
        };
    }
}
export default PersonalityCoordinator;
