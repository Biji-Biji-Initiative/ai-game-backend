import BaseCoordinator from "#app/application/BaseCoordinator.js";
import { FocusAreaError as _FocusAreaError } from "#app/core/focusArea/errors/focusAreaErrors.js";
import FocusAreaGenerationCoordinator from "#app/application/focusArea/FocusAreaGenerationCoordinator.js";
import FocusAreaManagementCoordinator from "#app/application/focusArea/FocusAreaManagementCoordinator.js";
'use strict';
/**
 * FocusAreaCoordinatorFacade class
 *
 * Acts as a facade over the specialized coordinators, delegating operations to the
 * appropriate coordinator while presenting a unified, simpler interface to clients.
 * This approach allows internal refactoring and specialization while maintaining
 * API stability.
 */
class FocusAreaCoordinatorFacade extends BaseCoordinator {
    /**
     * Create a new FocusAreaCoordinatorFacade.
     *
     * Initializes specialized coordinators and provides them with their required dependencies.
     * The facade doesn't implement business logic itself but delegates to the specialized
     * coordinators.
     *
     * @param {Object} dependencies - Service dependencies required by the underlying coordinators.
     * @param {Object} dependencies.userRepository - Repository for retrieving and updating user profiles.
     * @param {Object} dependencies.challengeRepository - Repository for accessing user's challenge history.
     * @param {Object} dependencies.progressRepository - Repository for accessing user's progression data.
     * @param {Object} dependencies.focusAreaRepository - Repository for storing and retrieving focus areas.
     * @param {Object} dependencies.focusAreaThreadService - Service for managing conversation threads for focus area generation.
     * @param {Object} dependencies.focusAreaGenerationService - Core domain service that handles the focus area generation logic.
     * @param {Object} dependencies.eventBus - Event bus for publishing domain events after operations.
     * @param {Object} dependencies.eventTypes - Constants for event types used in publishing events.
     * @param {Object} [dependencies.logger] - Optional logger instance for diagnostic information.
     * @throws {Error} If any required dependencies are missing from the specialized coordinators.
     */
    constructor(dependencies) {
        super({
            name: 'FocusAreaCoordinatorFacade',
            logger: dependencies?.logger,
        });
        
        // Validate that eventBus exists in dependencies
        if (!dependencies.eventBus) {
            const errorMessage = 'eventBus is required for FocusAreaGenerationCoordinator';
            console.error(`Error: ${errorMessage}`);
            throw new Error(errorMessage);
        }
        
        // Create specialized coordinators with their required dependencies
        this.generationCoordinator = new FocusAreaGenerationCoordinator(dependencies);
        this.managementCoordinator = new FocusAreaManagementCoordinator({
            ...dependencies,
            focusAreaGenerationCoordinator: this.generationCoordinator,
        });
    }
    /**
     * Generate personalized focus areas based on user profile and historical data.
     *
     * Delegates to the FocusAreaGenerationCoordinator which handles the complex process
     * of focus area generation, including thread management and domain event publishing.
     *
     * @param {Object} userData - User profile and preferences data.
     * @param {string} userData.id - User's unique identifier.
     * @param {string} userData.focus_area_thread_id - ID of the conversation thread for focus area generation.
     * @param {Array} [challengeHistory=[]] - User's previous challenge attempts and completions.
     * @param {Object} [progressData={}] - User's progression data across different skill areas.
     * @param {Object} [options={}] - Additional generation options.
     * @param {boolean} [options.forceRefresh=false] - Force regeneration even if cached data exists.
     * @returns {Promise<Array>} List of generated focus area objects.
     * @throws {FocusAreaError} If generation fails or required thread ID is missing.
     */
    generateFocusAreasFromUserData(userData, challengeHistory = [], progressData = {}, options = {}) {
        return this.generationCoordinator.generateFocusAreasFromUserData(userData, challengeHistory, progressData, options);
    }
    /**
     * Create a conversation thread for focus area generation.
     *
     * Delegates to the FocusAreaGenerationCoordinator which handles thread creation
     * and user profile updates.
     *
     * @param {string} userId - User ID for whom to create the thread.
     * @returns {Promise<string>} Thread ID that can be used for focus area generation.
     * @throws {FocusAreaError} If thread creation fails or user update fails critically.
     */
    createFocusAreaThread(userId) {
        return this.generationCoordinator.createFocusAreaThread(userId);
    }
    /**
     * Get focus areas for a user by ID.
     *
     * Delegates to the FocusAreaManagementCoordinator which handles the retrieval
     * of focus areas, including potential generation if none exist.
     *
     * @param {string} userId - User ID whose focus areas to retrieve.
     * @param {Object} [options={}] - Retrieval options for customizing the result.
     * @param {boolean} [options.generateIfMissing=true] - Generate focus areas if none exist.
     * @param {boolean} [options.forceRegeneration=false] - Force regeneration even if focus areas exist.
     * @param {boolean} [options.nameOnly=false] - Return only names instead of full objects.
     * @returns {Promise<Array>} List of focus areas or focus area names, depending on options.
     * @throws {FocusAreaError} If user not found or retrieval fails.
     */
    getFocusAreas(userId, options = {}) {
        return this.managementCoordinator.getFocusAreas(userId, options);
    }
    /**
     * Regenerate focus areas for a user.
     *
     * Delegates to the FocusAreaGenerationCoordinator which handles the complete
     * regeneration process, including fetching user data, deleting old areas,
     * generating new ones, and persisting them.
     *
     * @param {string} userId - User ID for whom to regenerate focus areas.
     * @returns {Promise<Array>} Newly generated and persisted focus area objects.
     * @throws {FocusAreaError} If any step in the regeneration process fails.
     */
    regenerateFocusAreas(userId) {
        return this.generationCoordinator.regenerateFocusAreas(userId);
    }
    /**
     * Get focus areas for a user by email address.
     *
     * Delegates to the FocusAreaManagementCoordinator which handles user lookup
     * by email and focus area retrieval. This is a convenience method for clients
     * that have the email but not the user ID.
     *
     * @param {string} userEmail - Email of the user whose focus areas to retrieve.
     * @param {Object} [options={}] - Retrieval options for customizing the result.
     * @param {boolean} [options.generateIfMissing=true] - Generate focus areas if none exist.
     * @param {boolean} [options.forceRegeneration=false] - Force regeneration even if focus areas exist.
     * @param {boolean} [options.nameOnly=true] - Return only names instead of full objects (defaults to true).
     * @returns {Promise<Array>} List of focus area names or objects, depending on options.
     * @throws {FocusAreaError} If user not found or retrieval fails.
     */
    getFocusAreasForUser(userEmail, options = {}) {
        return this.managementCoordinator.getFocusAreasForUser(userEmail, options);
    }
    /**
     * Set focus areas for a user by email address.
     *
     * Delegates to the FocusAreaManagementCoordinator which handles user lookup
     * by email and focus area persistence. This operation replaces all existing
     * focus areas for the user.
     *
     * @param {string} email - Email of the user whose focus areas to set.
     * @param {Array} focusAreas - Focus areas to set for the user.
     * @param {string|Object} focusAreas[].code - Focus area code or object with code property.
     * @returns {Promise<boolean>} True if the operation was successful.
     * @throws {FocusAreaError} If user not found or operation fails.
     */
    setFocusAreasForUser(email, focusAreas) {
        return this.managementCoordinator.setFocusAreasForUser(email, focusAreas);
    }
    /**
     * Set a user's active focus area by email address.
     *
     * Delegates to the FocusAreaManagementCoordinator which handles user lookup
     * by email and setting the active focus area. The active focus area is used
     * to determine which challenges to recommend next.
     *
     * @param {string} email - Email of the user whose active focus area to set.
     * @param {string} focusArea - Focus area code to set as active.
     * @returns {Promise<Object>} Updated user object with the new active focus area.
     * @throws {FocusAreaError} If user not found, focus area is invalid, or operation fails.
     */
    setUserFocusArea(email, focusArea) {
        return this.managementCoordinator.setUserFocusArea(email, focusArea);
    }
}
export default FocusAreaCoordinatorFacade;
