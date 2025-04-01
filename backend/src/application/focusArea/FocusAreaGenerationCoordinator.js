import BaseCoordinator from "#app/application/BaseCoordinator.js";
import { FocusAreaError } from "#app/core/focusArea/errors/focusAreaErrors.js";
'use strict';
/**
 * FocusAreaGenerationCoordinator class
 *
 * Responsible for orchestrating the generation of focus areas for users by coordinating
 * multiple domain services and repositories. This coordinator follows the facade pattern,
 * hiding the complexity of focus area generation from higher application layers.
 */
class FocusAreaGenerationCoordinator extends BaseCoordinator {
    /**
     * Create a new FocusAreaGenerationCoordinator
     *
     * @param {Object} dependencies - Service dependencies for focus area generation.
     * @param {Object} dependencies.userService - Service for user operations.
     * @param {Object} dependencies.challengeService - Service for challenge operations.
     * @param {Object} dependencies.progressService - Service for progress operations.
     * @param {Object} dependencies.focusAreaService - Service for focus area operations.
     * @param {Object} dependencies.focusAreaThreadService - Service for managing conversation threads for focus area generation.
     * @param {Object} dependencies.focusAreaGenerationService - Core domain service that handles the actual generation logic.
     * @param {Object} dependencies.eventBus - Event bus for communication between services.
     * @param {Object} dependencies.eventTypes - Event types for communication between services.
     * @param {Object} [dependencies.logger] - Optional logger instance for diagnostic information.
     * @throws {Error} If any required dependencies are missing.
     */
    constructor(dependencies) {
        super({
            name: 'FocusAreaGenerationCoordinator',
            logger: dependencies?.logger,
        });
        // Validate critical dependencies
        const requiredDependencies = [
            'userService',
            'challengeService',
            'progressService',
            'focusAreaService',
            'focusAreaThreadService',
            'focusAreaGenerationService',
            'eventBus',
            'eventTypes',
        ];
        this.validateDependencies(dependencies, requiredDependencies);
        
        // Initialize services and repositories
        this.userService = dependencies.userService;
        this.challengeService = dependencies.challengeService;
        this.progressService = dependencies.progressService;
        this.focusAreaService = dependencies.focusAreaService;
        this.focusAreaThreadService = dependencies.focusAreaThreadService;
        this.focusAreaGenerationService = dependencies.focusAreaGenerationService;
        this.eventBus = dependencies.eventBus;
        this.EventTypes = dependencies.eventTypes;
    }
    /**
     * Generate personalized focus areas based on user profile and historical data.
     *
     * This method orchestrates the generation process by:
     * 1. Validating thread existence
     * 2. Retrieving conversation context from previous interactions
     * 3. Delegating to the domain service for generation
     * 4. Updating the conversation thread with the latest response
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
        const context = {
            userId: userData.id,
            threadId: userData.focus_area_thread_id,
            forceRefresh: !!options.forceRefresh,
        };
        return this.executeOperation(async () => {
            // Validate thread ID
            if (!userData.focus_area_thread_id) {
                throw new FocusAreaError('No thread ID available for focus area generation', 400);
            }
            // Get previous response ID for conversation continuity
            const previousResponseId = await this.focusAreaThreadService.getLastResponseId(userData.focus_area_thread_id);
            // Use core domain service to generate focus areas
            const focusAreas = await this.focusAreaGenerationService.generateFocusAreas(userData, challengeHistory, progressData, {
                threadId: userData.focus_area_thread_id,
                previousResponseId,
                temperature: 0.9,
            });
            // Update thread with the latest response
            if (focusAreas.length > 0 && focusAreas[0].metadata?.responseId) {
                await this.focusAreaThreadService.updateWithResponseId(userData.focus_area_thread_id, focusAreas[0].metadata.responseId);
            }
            
            // Get user entity for adding domain events
            const userEntity = await this.userService.getUserEntity(userData.id);
            if (userEntity) {
                // Add domain event to the user entity
                userEntity.addDomainEvent(this.EventTypes.FOCUS_AREAS_GENERATED, {
                    userId: userData.id,
                    focusAreas: focusAreas.map(fa => fa.id || fa.code),
                    count: focusAreas.length,
                });
                
                // Save the user entity to persist and publish domain events
                await this.userService.saveUser(userEntity);
            } else {
                this.logger.warn('Could not add domain event - user entity not found', {
                    userId: userData.id,
                    eventType: this.EventTypes.FOCUS_AREAS_GENERATED
                });
            }
            
            return focusAreas;
        }, 'generateFocusAreas', context, FocusAreaError);
    }
    /**
     * Create a conversation thread for focus area generation.
     *
     * Creates a new thread in the focus area service and updates the user record with
     * the thread ID for future interactions. This setup is required before generation.
     *
     * @param {string} userId - User ID for whom to create the thread.
     * @returns {Promise<string>} Thread ID that can be used for focus area generation.
     * @throws {FocusAreaError} If thread creation fails or user update fails critically.
     */
    createFocusAreaThread(userId) {
        return this.executeOperation(async () => {
            // Use thread service to create thread
            const threadId = await this.focusAreaThreadService.createThread(userId);
            try {
                // Get user entity for updating and adding domain events
                const userEntity = await this.userService.getUserEntity(userId);
                if (userEntity) {
                    // Update the thread ID 
                    userEntity.setFocusAreaThreadId(threadId);
                    
                    // Add domain event for thread creation
                    userEntity.addDomainEvent(this.EventTypes.FOCUS_AREA_THREAD_CREATED, {
                        userId,
                        threadId
                    });
                    
                    // Save the user entity to persist changes and publish domain events
                    await this.userService.saveUser(userEntity);
                } else {
                    // Fallback to direct service update if entity not available
                    await this.userService.updateUser(userId, { focus_area_thread_id: threadId });
                    this.logger.warn('Could not add domain event - user entity not found', {
                        userId,
                        threadId,
                        eventType: this.EventTypes.FOCUS_AREA_THREAD_CREATED
                    });
                }
            }
            catch (updateError) {
                // Log the error but continue, since we already have the thread ID
                this.logger.warn('Could not update user record with thread ID', {
                    userId,
                    threadId,
                    error: updateError.message,
                });
            }
            return threadId;
        }, 'createFocusAreaThread', { userId }, FocusAreaError);
    }
    /**
     * Regenerate focus areas for a user.
     *
     * This method performs a complete regeneration by:
     * 1. Fetching the user's profile data
     * 2. Retrieving challenge history and progress data
     * 3. Removing any existing focus areas
     * 4. Creating a thread if needed
     * 5. Generating new focus areas based on current data
     * 6. Persisting the new focus areas
     *
     * @param {string} userId - User ID for whom to regenerate focus areas.
     * @returns {Promise<Array>} Newly generated and persisted focus area objects.
     * @throws {FocusAreaError} If any step in the regeneration process fails.
     */
    regenerateFocusAreas(userId) {
        return this.executeOperation(async () => {
            // Get user data using userService instead of repository
            const userData = await this.userService.getUserById(userId);
            if (!userData) {
                throw new FocusAreaError(`User with ID ${userId} not found`, 404);
            }
            // Get challenge history using challengeService instead of repository
            const challengeHistory = await this.challengeService.getUserChallengeHistory(userId);
            // Get user progress data using progressService instead of repository
            const progressData = await this.progressService.getUserProgress(userId);
            // Delete existing focus areas to start fresh using focusAreaService
            await this.focusAreaService.deleteAllForUser(userId);
            // Ensure user has a conversation thread for focus area generation
            if (!userData.focus_area_thread_id) {
                // Create a new thread for the user
                const threadId = await this.createFocusAreaThread(userId);
                userData.focus_area_thread_id = threadId;
            }
            // Generate new focus areas with force refresh flag
            const generatedFocusAreas = await this.generateFocusAreasFromUserData(userData, challengeHistory || [], progressData || {}, { forceRefresh: true });
            // Persist the generated focus areas to the database using focusAreaService
            await this.focusAreaService.save(userId, generatedFocusAreas);
            return generatedFocusAreas;
        }, 'regenerateFocusAreas', { userId }, FocusAreaError);
    }
}
export default FocusAreaGenerationCoordinator;
