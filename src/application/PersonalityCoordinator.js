import BaseCoordinator from "@/application/BaseCoordinator.js";
import { 
    TECH_THRESHOLDS, 
    ATTITUDE_THRESHOLD, 
    DEFAULT_ATTITUDE_VALUE,
    DETAIL_LEVEL,
    COMMUNICATION_STYLE,
    RESPONSE_FORMAT
} from "@/core/personality/config/attitudeMappingConfig.js";
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
     * @param {Object} dependencies.personalityService - Personality domain service
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
            'personalityService',
            'personalityDataLoader'
        ];
        this.validateDependencies(dependencies, requiredDependencies);
        // Initialize services
        this.userService = dependencies.userService;
        this.personalityService = dependencies.personalityService;
        this.dataLoader = dependencies.personalityDataLoader;
    }
    /**
     * Synchronize a user's preferences based on personality AI attitudes
     * This is a cross-domain operation that translates personality domain data to user domain data
     *
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated user preferences
     */
    synchronizeUserPreferences(userId) {
        return this.executeOperation(async () => {
            // Get user from user domain
            const user = await this.userService.getUserById(userId);
            if (!user) {
                this.logger.warn('User not found for preferences synchronization', { userId });
                return null;
            }
            // Get AI attitudes using the data loader (cached)
            const aiAttitudes = await this.dataLoader.getAiAttitudes(userId);
            if (!aiAttitudes || Object.keys(aiAttitudes).length === 0) {
                this.logger.info('No AI attitudes found for user, using defaults', { userId });
                // Continue with default attitudes
            }
            // Map attitudes to preferences (pure function, no domain knowledge)
            const preferences = this._mapAttitudesToPreferences(aiAttitudes);
            // Update user preferences through user domain model
            this.logger.debug('Updating user preferences', {
                userId,
                preferences: Object.keys(preferences)
            });
            // Use the dedicated domain model method to update preferences
            user.updateAIPreferences(preferences);
            // Save user through the UserService rather than directly with repository
            await this.userService.updateUser(userId, { preferences: user.preferences });
            return user.preferences;
        }, 'synchronizeUserPreferences', { userId });
    }
    /**
     * Get AI attitudes for a user (cached)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} AI attitudes
     */
    getAiAttitudes(userId) {
        return this.executeOperation(() => {
            return this.dataLoader.getAiAttitudes(userId);
        }, 'getAiAttitudes', { userId });
    }
    /**
     * Get personality traits for a user (cached)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Personality traits
     */
    getPersonalityTraits(userId) {
        return this.executeOperation(() => {
            return this.dataLoader.getPersonalityTraits(userId);
        }, 'getPersonalityTraits', { userId });
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
        const techSum = (aiAttitudes.tech_savvy || DEFAULT_ATTITUDE_VALUE) + 
                        (aiAttitudes.early_adopter || DEFAULT_ATTITUDE_VALUE);
        
        let detailLevel = DETAIL_LEVEL.DETAILED;
        if (techSum > TECH_THRESHOLDS.HIGH) {
            detailLevel = DETAIL_LEVEL.COMPREHENSIVE;
        }
        else if (techSum < TECH_THRESHOLDS.LOW) {
            detailLevel = DETAIL_LEVEL.BASIC;
        }
        
        // Set communication style based on attitudes
        let communicationStyle = COMMUNICATION_STYLE.CASUAL;
        if (aiAttitudes.security_conscious && 
            aiAttitudes.security_conscious > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.FORMAL;
        }
        else if (aiAttitudes.experimental && 
                aiAttitudes.experimental > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.CASUAL;
        }
        else if (aiAttitudes.ethical_concern && 
                aiAttitudes.ethical_concern > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            communicationStyle = COMMUNICATION_STYLE.TECHNICAL;
        }
        
        // Set response format preferences
        let responseFormat = RESPONSE_FORMAT.MIXED;
        if (aiAttitudes.skeptical && 
            aiAttitudes.skeptical > ATTITUDE_THRESHOLD.SIGNIFICANT) {
            responseFormat = RESPONSE_FORMAT.STRUCTURED;
        }
        else if (aiAttitudes.early_adopter && 
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
