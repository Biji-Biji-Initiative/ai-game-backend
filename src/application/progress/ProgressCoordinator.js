import BaseCoordinator from "@/application/BaseCoordinator.js";
import appError from "@/core/infra/errors/AppError.js";
import { 
    Email, ChallengeId, FocusArea,
    createEmail, createChallengeId, createFocusArea,
    ensureVO
} from "@/core/common/valueObjects/index.js";
'use strict';
const { AppError } = appError;
/**
 * ProgressCoordinator class
 *
 * Responsible for orchestrating progress-related operations across the application,
 * including tracking challenge completion progress, retrieving progress summaries,
 * and managing focus area specific progress metrics.
 */
class ProgressCoordinator extends BaseCoordinator {
    /**
     * Create a new ProgressCoordinator
     *
     * @param {Object} dependencies - Service dependencies for progress tracking operations.
     * @param {Object} dependencies.progressService - Domain service for progress calculations and persistence.
     * @param {Object} dependencies.userService - Service for user operations.
     * @param {Object} [dependencies.eventBus] - Optional event bus for publishing domain events.
     * @param {Object} [dependencies.EventTypes] - Optional event type constants for domain events.
     * @param {Object} [dependencies.logger] - Optional logger instance for diagnostic information.
     * @throws {Error} If any required dependencies are missing.
     */
    constructor(dependencies) {
        super({
            name: 'ProgressCoordinator',
            logger: dependencies?.logger,
        });
        // Validate critical dependencies
        const requiredDependencies = ['progressService', 'userService'];
        this.validateDependencies(dependencies, requiredDependencies);
        // Initialize services and repositories
        this.progressService = dependencies.progressService;
        this.userService = dependencies.userService;
        this.eventBus = dependencies.eventBus;
        this.EventTypes = dependencies.EventTypes;
    }
    /**
     * Update user progress after completing a challenge.
     *
     * This method orchestrates the progress update process by:
     * 1. Retrieving the user entity by email
     * 2. Normalizing evaluation metrics
     * 3. Delegating to the progress domain service for progress calculation
     * 4. Publishing a domain event about the progress update
     *
     * @param {string|Email} userEmail - Email address of the user who completed the challenge.
     * @param {string|FocusArea} focusArea - Focus area code that the challenge belongs to.
     * @param {string|ChallengeId} challengeId - Unique identifier of the completed challenge.
     * @param {Object} evaluation - Evaluation results from the challenge completion.
     * @param {number} [evaluation.score=0] - Numeric score from 0-100 representing performance.
     * @param {string} [evaluation.difficulty='medium'] - Difficulty level of the challenge (easy, medium, hard).
     * @param {number} [evaluation.completionTime] - Time taken to complete in seconds.
     * @param {Array<string>} [evaluation.strengths=[]] - Identified strengths in the user's performance.
     * @param {Array<string>} [evaluation.areasForImprovement=[]] - Areas where the user could improve.
     * @returns {Promise<Object>} Updated progress data including new metrics and insights.
     * @throws {AppError} If user not found (404) or progress update fails (500).
     */
    updateProgressAfterChallenge(userEmail, focusArea, challengeId, evaluation) {
        return this.executeOperation(async () => {
            // Convert parameters to value objects if needed
            const emailVO = ensureVO(userEmail, Email, createEmail);
            const focusAreaVO = ensureVO(focusArea, FocusArea, createFocusArea);
            const challengeIdVO = ensureVO(challengeId, ChallengeId, createChallengeId);
            // Validate value objects
            if (!emailVO) {
                throw new AppError(`Invalid email format: ${userEmail}`, 400, {
                    errorCode: 'INVALID_EMAIL',
                });
            }
            if (!challengeIdVO) {
                throw new AppError(`Invalid challenge ID: ${challengeId}`, 400, {
                    errorCode: 'INVALID_CHALLENGE_ID',
                });
            }
            // Get the user entity from the user service
            const user = await this.userService.getUserByEmail(emailVO);
            if (!user) {
                throw new AppError(`User with email ${emailVO.value} not found`, 404, {
                    errorCode: 'USER_NOT_FOUND',
                });
            }
            // Normalize evaluation metrics for domain processing
            const metrics = {
                score: evaluation.score || 0,
                difficulty: evaluation.difficulty || 'medium',
                completionTime: evaluation.completionTime,
                strengths: evaluation.strengths || [],
                areas_for_improvement: evaluation.areasForImprovement || [],
            };
            // Get the focus area value if available or use the original value
            const focusAreaValue = focusAreaVO ? focusAreaVO.value : focusArea;
            // Update progress using domain service
            const updatedProgress = await this.progressService.updateProgress(user.id, focusAreaValue, challengeIdVO.value, metrics);
            
            // Use entity-based event collection instead of direct event publishing
            if (this.eventBus && this.EventTypes) {
                // Get user entity to add domain event
                const userEntity = await this.userService.getUserEntity(user.id);
                if (userEntity) {
                    // Add domain event to entity
                    userEntity.addDomainEvent(this.EventTypes.USER_PROGRESS_UPDATED, {
                        userId: user.id,
                        userEmail: emailVO.value,
                        focusArea: focusAreaValue,
                        challengeId: challengeIdVO.value,
                        metrics,
                        timestamp: new Date().toISOString(),
                    });
                    
                    // Save entity which will publish the event
                    await this.userService.saveUser(userEntity);
                }
            }
            
            return updatedProgress;
        }, 'updateProgressAfterChallenge', {
            userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value,
            focusArea: typeof focusArea === 'string' ? focusArea : focusArea?.value,
            challengeId: typeof challengeId === 'string' ? challengeId : challengeId?.value
        }, AppError);
    }
    /**
     * Get overall progress summary for a user across all focus areas.
     *
     * Retrieves and compiles comprehensive progress metrics, providing insights
     * into the user's overall performance, skill development, and challenge completion rates.
     *
     * @param {string|Email} userEmail - Email address of the user whose progress to retrieve.
     * @returns {Promise<Object>} Progress summary containing aggregated metrics:
     *   - completedChallenges: Total number of challenges completed
     *   - averageScore: Average score across all challenges
     *   - focusAreaBreakdown: Progress metrics per focus area
     *   - recentActivity: List of recently completed challenges
     *   - strengthAreas: Areas where user has shown consistent strength
     *   - improvementAreas: Areas needing improvement
     * @throws {AppError} If user not found (404) or progress retrieval fails (500).
     */
    getProgressSummary(userEmail) {
        return this.executeOperation(async () => {
            // Convert email to value object if needed
            const emailVO = ensureVO(userEmail, Email, createEmail);
            // Validate value object
            if (!emailVO) {
                throw new AppError(`Invalid email format: ${userEmail}`, 400, {
                    errorCode: 'INVALID_EMAIL',
                });
            }
            // Get the user entity from the user service
            const user = await this.userService.getUserByEmail(emailVO);
            if (!user) {
                throw new AppError(`User with email ${emailVO.value} not found`, 404, {
                    errorCode: 'USER_NOT_FOUND',
                });
            }
            // Get progress summary from domain service
            return this.progressService.getProgressSummary(user.id);
        }, 'getProgressSummary', { userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value }, AppError);
    }
    /**
     * Get detailed progress for a specific focus area.
     *
     * Retrieves comprehensive metrics and insights for a user's progress
     * within a particular focus area, including challenge completion history,
     * skill development trajectory, and personalized feedback.
     *
     * @param {string|Email} userEmail - Email address of the user whose progress to retrieve.
     * @param {string|FocusArea} focusArea - Focus area code to get detailed progress for.
     * @returns {Promise<Object>} Detailed focus area progress including:
     *   - completedChallenges: List of completed challenges in this focus area
     *   - skillLevels: Current skill levels for relevant skills
     *   - progressOverTime: Historical progress data points
     *   - strengths: Specific strengths identified in this focus area
     *   - improvementAreas: Specific improvement areas for this focus area
     *   - recommendations: Recommended next steps based on progress
     * @throws {AppError} If user not found (404), focus area is invalid, or retrieval fails (500).
     */
    getFocusAreaProgress(userEmail, focusArea) {
        return this.executeOperation(async () => {
            // Convert parameters to value objects if needed
            const emailVO = ensureVO(userEmail, Email, createEmail);
            const focusAreaVO = ensureVO(focusArea, FocusArea, createFocusArea);
            // Validate value objects
            if (!emailVO) {
                throw new AppError(`Invalid email format: ${userEmail}`, 400, {
                    errorCode: 'INVALID_EMAIL',
                });
            }
            // Get the user entity from the user service
            const user = await this.userService.getUserByEmail(emailVO);
            if (!user) {
                throw new AppError(`User with email ${emailVO.value} not found`, 404, {
                    errorCode: 'USER_NOT_FOUND',
                });
            }
            // Validate focus area
            if (!focusAreaVO) {
                throw new AppError('Invalid focus area format', 400, {
                    errorCode: 'INVALID_FOCUS_AREA',
                });
            }
            // Get detailed progress for focus area from domain service
            return this.progressService.getFocusAreaProgress(user.id, focusAreaVO.value);
        }, 'getFocusAreaProgress', {
            userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value,
            focusArea: typeof focusArea === 'string' ? focusArea : focusArea?.value
        }, AppError);
    }
}
export default ProgressCoordinator;
