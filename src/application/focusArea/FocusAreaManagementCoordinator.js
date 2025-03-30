import BaseCoordinator from "../BaseCoordinator.js";
import { FocusAreaError } from "../../core/focusArea/errors/focusAreaErrors.js";
import { 
    createUserId, createEmail, createFocusArea, 
    Email, UserId, FocusArea,
    ensureVO 
} from "../../core/common/valueObjects/index.js";
'use strict';
/**
 * FocusAreaManagementCoordinator class
 * Responsible specifically for managing and retrieving focus areas
 */
class FocusAreaManagementCoordinator extends BaseCoordinator {
    /**
     * Create a new FocusAreaManagementCoordinator
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.userService - Service for user operations
     * @param {Object} dependencies.focusAreaService - Service for focus area operations
     * @param {Object} dependencies.focusAreaValidationService - Service for focus area validation
     * @param {Object} dependencies.eventBus - Event bus for domain events
     * @param {Object} dependencies.eventTypes - Event type constants
     * @param {Object} dependencies.focusAreaGenerationCoordinator - Coordinator for generating focus areas
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies) {
        super({
            name: 'FocusAreaManagementCoordinator',
            logger: dependencies?.logger
        });
        // Validate critical dependencies
        const requiredDependencies = [
            'userService',
            'focusAreaService',
            'focusAreaValidationService'
        ];
        this.validateDependencies(dependencies, requiredDependencies);
        // Initialize services
        this.userService = dependencies.userService;
        this.focusAreaService = dependencies.focusAreaService;
        this.focusAreaValidationService = dependencies.focusAreaValidationService;
        this.eventBus = dependencies.eventBus;
        this.EventTypes = dependencies.eventTypes;
        this.focusAreaGenerationCoordinator = dependencies.focusAreaGenerationCoordinator;
    }
    /**
     * Get focus areas for a user
     * @param {string|UserId} userId - User ID whose focus areas to retrieve
     * @param {Object} [options={}] - Retrieval options
     * @param {boolean} [options.forceRefresh=false] - Force refresh from API even if cached
     * @param {boolean} [options.nameOnly=false] - Return only focus area names
     * @returns {Promise<Array>} List of personalized focus areas
     * @throws {FocusAreaError} If retrieval fails or user not found
     */
    getFocusAreas(userId, options = {}) {
        return this.executeOperation(async () => {
            // Convert to value object if needed
            const userIdVO = ensureVO(userId, UserId, createUserId);
            if (!userIdVO) {
                throw new FocusAreaError(`Invalid user ID: ${userId}`, 400);
            }
            // First check if the user has existing focus areas in the database
            let existingFocusAreas = [];
            try {
                existingFocusAreas = await this.focusAreaService.getFocusAreasForUser(userIdVO.value);
            }
            catch (error) {
                this.logger.warn('Error fetching existing focus areas, continuing with generation', {
                    userId: userIdVO.value,
                    error: error.message
                });
            }
            // If focus areas exist and not forcing refresh, return them
            if (existingFocusAreas.length > 0 && !options.forceRefresh) {
                return options.nameOnly
                    ? existingFocusAreas.map(area => area.name)
                    : existingFocusAreas;
            }
            // No focus areas found or forcing refresh, use generation coordinator
            if (!this.focusAreaGenerationCoordinator) {
                throw new FocusAreaError('Focus area generation coordinator not available', 500);
            }
            // Generate new focus areas
            const generatedFocusAreas = await this.focusAreaGenerationCoordinator.regenerateFocusAreas(userIdVO.value);
            // Return focus areas based on requested format
            return options.nameOnly
                ? generatedFocusAreas.map(area => area.name)
                : generatedFocusAreas;
        }, 'getFocusAreas', { userId: userId instanceof UserId ? userId.value : userId, options }, FocusAreaError);
    }
    /**
     * Get focus areas for a user by email
     * @param {string|Email} userEmail - Email of the user whose focus areas to retrieve
     * @param {Object} [options={}] - Retrieval options
     * @param {boolean} [options.forceRefresh=false] - Force refresh from API even if cached
     * @param {boolean} [options.nameOnly=false] - Return only focus area names
     * @returns {Promise<Array>} List of personalized focus areas
     * @throws {FocusAreaError} If user not found or retrieval fails
     */
    getFocusAreasForUser(userEmail, options = {}) {
        return this.executeOperation(async () => {
            // Convert to value object if needed
            const emailVO = ensureVO(userEmail, Email, createEmail);
            if (!emailVO) {
                throw new FocusAreaError(`Invalid email: ${userEmail}`, 400);
            }
            // Find user by email using userService
            const user = await this.userService.getUserByEmail(emailVO.value);
            if (!user) {
                throw new FocusAreaError(`User with email ${emailVO.value} not found`, 404);
            }
            // Convert userId to value object
            const userIdVO = createUserId(user.id);
            if (!userIdVO) {
                throw new FocusAreaError(`Invalid user ID: ${user.id}`, 500);
            }
            // Get focus areas using the user's ID
            return this.getFocusAreas(userIdVO, { ...options, nameOnly: true });
        }, 'getFocusAreasForUser', { userEmail: userEmail instanceof Email ? userEmail.value : userEmail }, FocusAreaError);
    }
    /**
     * Set focus areas for a user
     * @param {string|Email} email - Email of the user whose focus areas to set
     * @param {Array} focusAreas - Focus areas to set (array of objects or strings)
     * @returns {Promise<boolean>} Success indicator
     * @throws {FocusAreaError} If user not found or operation fails
     */
    setFocusAreasForUser(email, focusAreas) {
        return this.executeOperation(async () => {
            // Convert to value object if needed
            const emailVO = ensureVO(email, Email, createEmail);
            if (!emailVO) {
                throw new FocusAreaError(`Invalid email: ${email}`, 400);
            }
            // Get the user using userService
            const user = await this.userService.getUserByEmail(emailVO.value);
            if (!user) {
                throw new FocusAreaError(`User with email ${emailVO.value} not found`, 404);
            }
            // Convert userId to value object
            const userIdVO = createUserId(user.id);
            if (!userIdVO) {
                throw new FocusAreaError(`Invalid user ID: ${user.id}`, 500);
            }
            // Convert focus areas to value objects if they're strings
            const focusAreaVOs = Array.isArray(focusAreas)
                ? focusAreas.map(fa => {
                    if (typeof fa === 'string') {
                        return ensureVO(fa, FocusArea, createFocusArea);
                    }
                    return fa;
                }).filter(Boolean)
                : [];
            // Validate focus areas using the validation service
            for (const fa of focusAreaVOs) {
                const focusAreaValue = fa instanceof FocusArea ? fa.value : fa;
                const isValid = await this.focusAreaValidationService.validateFocusArea(focusAreaValue);
                if (!isValid) {
                    this.logger.warn(`Invalid focus area: ${focusAreaValue}, removing from list`);
                    const index = focusAreaVOs.indexOf(fa);
                    if (index > -1) {
                        focusAreaVOs.splice(index, 1);
                    }
                }
            }
            // Save focus areas using focusAreaService
            await this.focusAreaService.deleteAllForUser(userIdVO.value);
            await this.focusAreaService.save(userIdVO.value, focusAreaVOs.map(fa => fa instanceof FocusArea ? fa.value : fa));
            // Publish a domain event if event bus is available
            if (this.eventBus && this.EventTypes) {
                await this.eventBus.publishEvent(this.EventTypes.USER_FOCUS_AREAS_SET, {
                    userId: userIdVO.value,
                    email: emailVO.value,
                    focusAreas: focusAreaVOs.map(fa => fa instanceof FocusArea ? fa.value : fa)
                });
            }
            return true;
        }, 'setFocusAreasForUser', {
            email: email instanceof Email ? email.value : email,
            focusAreaCount: focusAreas?.length
        }, FocusAreaError);
    }
    /**
     * Set a user's active focus area
     * @param {string|Email} email - Email of the user whose focus area to set
     * @param {string|FocusArea} focusArea - Focus area code to set as active
     * @returns {Promise<Object>} Updated user object
     * @throws {FocusAreaError} If user not found or operation fails
     */
    setUserFocusArea(email, focusArea) {
        return this.executeOperation(async () => {
            // Convert to value objects if needed
            const emailVO = ensureVO(email, Email, createEmail);
            const focusAreaVO = ensureVO(focusArea, FocusArea, createFocusArea);
            if (!emailVO) {
                throw new FocusAreaError(`Invalid email: ${email}`, 400);
            }
            if (!focusAreaVO) {
                throw new FocusAreaError(`Invalid focus area: ${focusArea}`, 400);
            }
            // Validate the focus area using the validation service
            const isValid = await this.focusAreaValidationService.validateFocusArea(focusAreaVO.value);
            if (!isValid) {
                throw new FocusAreaError(`Invalid focus area: ${focusAreaVO.value}`, 400);
            }
            // Get the user using userService
            const user = await this.userService.getUserByEmail(emailVO.value);
            if (!user) {
                throw new FocusAreaError(`User with email ${emailVO.value} not found`, 404);
            }
            // Convert userId to value object
            const userIdVO = createUserId(user.id);
            if (!userIdVO) {
                throw new FocusAreaError(`Invalid user ID: ${user.id}`, 500);
            }
            // Update the user's focus area using userService
            const updates = { focus_area: focusAreaVO.value };
            const updatedUser = await this.userService.updateUser(emailVO.value, updates);
            // Publish a domain event if event bus is available
            if (this.eventBus && this.EventTypes) {
                await this.eventBus.publishEvent(this.EventTypes.USER_FOCUS_AREA_SET, {
                    userId: userIdVO.value,
                    email: emailVO.value,
                    focusArea: focusAreaVO.value
                });
            }
            return updatedUser;
        }, 'setUserFocusArea', {
            email: email instanceof Email ? email.value : email,
            focusArea: focusArea instanceof FocusArea ? focusArea.value : focusArea
        }, FocusAreaError);
    }
}
export default FocusAreaManagementCoordinator;
