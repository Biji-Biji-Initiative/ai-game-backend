"../../../core/infra/errors/errorStandardization.js;
""../../../core/evaluation/errors/EvaluationErrors.js117;
""../../../core/infra/logging/domainLogger.js293;
import {
  SKILL_THRESHOLDS,
  COLLECTION_LIMITS,
  CONSISTENCY_THRESHOLD,
  WEIGHT_NORMALIZATION,
  DEFAULT_CATEGORY_WEIGHTS
} from ""./config/evaluationConfig.js";

'use strict';

// Create an error mapper for services
const evaluationServiceErrorMapper = createErrorMapper({
    EvaluationNotFoundError: EvaluationNotFoundError,
    EvaluationValidationError: EvaluationValidationError,
    EvaluationProcessingError: EvaluationProcessingError,
    Error: EvaluationError,
}, EvaluationError);

/**
 * User Context Service
 *
 * Application service for gathering, integrating and managing user context
 * for deeply personalized evaluations. This service coordinates data from
 * multiple domains (user, challenge, evaluation) to build a comprehensive 
 * user context.
 * 
 * This service follows the CQRS (Command Query Responsibility Segregation) pattern
 * by intentionally using direct repository access for read-heavy operations to 
 * optimize performance. This architectural decision is documented for clarity
 * and intentionally deviates from the general pattern of accessing repositories
 * only through domain services.
 * 
 * The benefits of this approach include:
 * 1. Reduced latency for complex data aggregation across multiple domains
 * 2. Simplified caching of assembled context rather than individual service calls
 * 3. Improved performance for read-intensive operations with no domain logic
 */
class UserContextService {
    /**
     * Create a new UserContextService
     * 
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.userRepository - Repository for user data
     * @param {Object} dependencies.challengeRepository - Repository for challenges
     * @param {Object} dependencies.evaluationRepository - Repository for evaluations
     * @param {Object} dependencies.cacheService - Cache service for optimizing data access
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { userRepository, challengeRepository, evaluationRepository, cacheService, logger } = dependencies;
        
        // Validate required repository dependencies
        if (!userRepository) {
            throw new Error('userRepository is required for UserContextService');
        }
        
        if (!challengeRepository) {
            throw new Error('challengeRepository is required for UserContextService');
        }
        
        if (!evaluationRepository) {
            throw new Error('evaluationRepository is required for UserContextService');
        }
        
        // Validate repository interfaces have required methods
        if (typeof userRepository.getUserById !== 'function') {
            throw new Error('userRepository must implement getUserById method');
        }
        
        if (typeof challengeRepository.getChallengesByUserId !== 'function') {
            throw new Error('challengeRepository must implement getChallengesByUserId method');
        }
        
        if (typeof evaluationRepository.getEvaluationsByUserId !== 'function') {
            throw new Error('evaluationRepository must implement getEvaluationsByUserId method');
        }

        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.evaluationRepository = evaluationRepository;
        this.cacheService = cacheService;
        this.logger = logger || evaluationLogger.child({ service: 'UserContextService' });

        // Apply standardized error handling
        this.gatherUserContext = withServiceErrorHandling(
            this.gatherUserContext.bind(this), 
            {
                methodName: 'gatherUserContext',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationServiceErrorMapper
            }
        );

        this.extractPersonalizedCriteria = withServiceErrorHandling(
            this.extractPersonalizedCriteria.bind(this),
            {
                methodName: 'extractPersonalizedCriteria',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationServiceErrorMapper
            }
        );

        this.getDefaultCategoryWeights = withServiceErrorHandling(
            this.getDefaultCategoryWeights.bind(this),
            {
                methodName: 'getDefaultCategoryWeights',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationServiceErrorMapper
            }
        );
        
        // Create a simple in-memory cache fallback if no cacheService provided
        if (!this.cacheService) {
            this.logger.warn('No cacheService provided, using no-op fallback');
            this.cacheService = {
                async getOrSet(key, factory) {
                    return factory();
                }
            };
        }
    }

    /**
     * Gather comprehensive user context for personalized evaluations
     *
     * @param {string} userId - User ID to gather context for
     * @param {Object} options - Options for context gathering
     * @returns {Promise<Object>} Comprehensive user context
     */
    async gatherUserContext(userId, options = {}) {
        if (!userId) {
            throw new EvaluationValidationError('User ID is required to gather context');
        }
        
        // Create a cache key that includes user ID and any relevant options
        const skipCache = options.skipCache === true;
        const cacheKey = `userContext:${userId}`;
        const cacheTTL = 10 * 60; // 10 minutes TTL
        
        // Use cacheService.getOrSet to either retrieve from cache or compute and store
        if (skipCache) {
            return this._gatherUserContextInternal(userId, options);
        }
        
        return this.cacheService.getOrSet(cacheKey, async () => {
            return this._gatherUserContextInternal(userId, options);
        }, cacheTTL);
    }
    
    /**
     * Internal method to gather user context without caching
     * 
     * @param {string} userId - User ID to gather context for
     * @param {Object} options - Options for context gathering
     * @returns {Promise<Object>} Comprehensive user context 
     * @throws {EvaluationValidationError} If invalid input is provided
     * @throws {EvaluationNotFoundError} If user data cannot be found
     * @throws {EvaluationProcessingError} If data processing fails
     * @private
     */
    async _gatherUserContextInternal(userId, options = {}) {
        /**
         * REPOSITORY ACCESS PATTERN:
         * 
         * This method implements the CQRS pattern by directly accessing repositories
         * for complex read operations that require aggregating data from multiple domains.
         * 
         * We are explicitly documenting this architectural choice to:
         * 1. Avoid latency of multiple service layer calls for a read-only aggregate
         * 2. Optimize performance for this critical and frequently called operation
         * 3. Simplify the implementation of cross-domain data aggregation
         * 
         * Note: For write operations and complex domain logic we still use domain services.
         */
        
        // Initialize base context
        const context = {
            userId,
            profile: {},
            learningJourney: {
                completedChallenges: 0,
                challengeHistory: [],
                evaluationHistory: [],
                focusAreas: [],
                skillLevels: {},
                averageScore: 0
            },
            preferences: {},
            strengths: [],
            areasForGrowth: [],
            sessionContext: {},
            metadata: {
                lastUpdated: new Date().toISOString(),
                contextVersion: '2.0',
            },
        };

        // Get user profile from repository
        try {
            const userProfile = await this.userRepository.getUserById(userId);
            
            if (!userProfile) {
                this.logger.warn('User profile not found for context gathering', { userId });
                // Throw a domain-specific error for better error handling
                throw new EvaluationNotFoundError(`User profile not found for ID: ${userId}`);
            } else if (typeof userProfile !== 'object') {
                this.logger.warn('Invalid user profile data type', { 
                    userId, 
                    dataType: typeof userProfile,
                    value: JSON.stringify(userProfile).substring(0, 100) 
                });
                throw new EvaluationProcessingError(
                    `Invalid user profile data type: expected object, got ${typeof userProfile}`
                );
            } else {
                // Safe extraction of user profile data with fallbacks
                // Create a validator function to safely extract fields with logging
                const safeExtract = (obj, path, defaultValue = null) => {
                    try {
                        const parts = path.split('.');
                        let current = obj;
                        
                        for (const part of parts) {
                            if (current === null || current === undefined || typeof current !== 'object') {
                                return defaultValue;
                            }
                            current = current[part];
                        }
                        
                        return current !== undefined ? current : defaultValue;
                    } catch (e) {
                        this.logger.debug(`Error extracting ${path} from user profile`, {
                            userId,
                            error: e.message
                        });
                        return defaultValue;
                    }
                };
                
                // Validate array fields safely
                const safeArray = (value, itemValidator = null) => {
                    if (!Array.isArray(value)) {
                        return [];
                    }
                    
                    if (itemValidator && typeof itemValidator === 'function') {
                        return value.filter(item => itemValidator(item));
                    }
                    
                    return [...value];
                };
                
                // Construct profile with comprehensive validation
                context.profile = {
                    name: safeExtract(userProfile, 'name') || 
                          safeExtract(userProfile, 'displayName') || 
                          safeExtract(userProfile, 'fullName') || 
                          safeExtract(userProfile, 'username') || null,
                    email: safeExtract(userProfile, 'email'),
                    skillLevel: safeExtract(userProfile, 'skillLevel') || 
                               safeExtract(userProfile, 'profile.skillLevel') || 
                               safeExtract(userProfile, 'level') || 'intermediate',
                    profession: safeExtract(userProfile, 'profession') || 
                               safeExtract(userProfile, 'title') || 
                               safeExtract(userProfile, 'jobTitle') || 
                               safeExtract(userProfile, 'occupation') || null,
                    // Ensure arrays with comprehensive validation
                    focusAreas: safeArray(safeExtract(userProfile, 'focusAreas'), 
                                        item => typeof item === 'string' && item.trim() !== ''),
                    learningGoals: safeArray(safeExtract(userProfile, 'learningGoals')) || 
                                  safeArray(safeExtract(userProfile, 'profile.learningGoals')),
                    preferredLearningStyle: safeExtract(userProfile, 'preferredLearningStyle') || 
                                          safeExtract(userProfile, 'learningStyle') || null,
                };
                
                // Log warning if critical fields are missing
                if (!context.profile.name && !context.profile.email) {
                    this.logger.warn('User profile missing critical identification fields (name, email)', { 
                        userId,
                        availableFields: Object.keys(userProfile).join(', ')
                    });
                }
                
                // Add focus areas to learning journey with validation
                if (Array.isArray(userProfile?.focusAreas)) {
                    // Validate each focus area is a valid string
                    context.learningJourney.focusAreas = userProfile.focusAreas
                        .filter(area => typeof area === 'string' && area.trim() !== '')
                        .map(area => area.trim());
                } else if (typeof userProfile?.focusArea === 'string' && userProfile.focusArea.trim() !== '') {
                    // Handle single focusArea property if it exists
                    context.learningJourney.focusAreas = [userProfile.focusArea.trim()];
                }
                
                // Extract preferences safely with validation
                if (typeof userProfile?.preferences === 'object' && userProfile.preferences !== null) {
                    // Deep clone and validate each preference value
                    const safePreferences = {};
                    
                    for (const [key, value] of Object.entries(userProfile.preferences)) {
                        if (typeof key !== 'string' || key.trim() === '') {
                            continue; // Skip invalid keys
                        }
                        
                        // Handle different value types appropriately
                        if (typeof value === 'string' || 
                            typeof value === 'number' || 
                            typeof value === 'boolean') {
                            safePreferences[key] = value;
                        } else if (Array.isArray(value)) {
                            safePreferences[key] = [...value]; // Clone array
                        } else if (typeof value === 'object' && value !== null) {
                            try {
                                safePreferences[key] = JSON.parse(JSON.stringify(value)); // Deep clone
                            } catch (e) {
                                this.logger.warn(`Could not clone complex preference value for key '${key}'`, {
                                    userId,
                                    valueType: typeof value,
                                    error: e.message
                                });
                            }
                        } else {
                            this.logger.debug(`Skipping preference with invalid value type: ${key}`, {
                                userId,
                                valueType: typeof value
                            });
                        }
                    }
                    
                    context.preferences = safePreferences;
                }
            }
        } catch (profileError) {
            // Enhanced error handling with specific error types
            this.logger.warn('Error fetching user profile for context', {
                userId,
                operation: 'userRepository.getUserById',
                errorType: profileError.name || 'Unknown',
                error: profileError.message,
                stack: profileError.stack
            });
            
            // Rethrow domain-specific errors
            if (profileError instanceof EvaluationError) {
                throw profileError;
            }
            
            // Map to a domain-specific error otherwise
            throw new EvaluationProcessingError(
                `Failed to process user profile data: ${profileError.message}`,
                { cause: profileError }
            );
        }

        // Get challenge history - Using repository directly for CQRS read pattern
        try {
            const userChallenges = await this.challengeRepository.getChallengesByUserId(userId, {
                limit: COLLECTION_LIMITS.CHALLENGES,
                sort: 'completedAt:desc',
            });
            
            // Validate repository response and handle different scenarios
            if (!userChallenges) {
                this.logger.debug('No challenge history found', { userId });
                // Set an empty array as fallback
                context.learningJourney.challengeHistory = [];
            } else if (!Array.isArray(userChallenges)) {
                this.logger.warn('Invalid challenge history data type', { 
                    userId, 
                    dataType: typeof userChallenges,
                    value: JSON.stringify(userChallenges).substring(0, 100)
                });
                throw new EvaluationProcessingError(
                    `Invalid challenge history format: expected array, got ${typeof userChallenges}`
                );
            } else if (userChallenges.length > 0) {
                // Track original and valid challenge counts for logging
                const originalCount = userChallenges.length;
                let validCount = 0;
                let invalidCount = 0;
                
                context.learningJourney.completedChallenges = originalCount;
                
                // Process challenge history with enhanced data validation
                context.learningJourney.challengeHistory = userChallenges
                    .filter(challenge => {
                        // Validate challenge is an object
                        if (!challenge || typeof challenge !== 'object') {
                            invalidCount++;
                            this.logger.warn('Invalid challenge item in user context', { 
                                userId,
                                challengeType: typeof challenge,
                                value: challenge ? JSON.stringify(challenge).substring(0, 50) : 'null'
                            });
                            return false;
                        }
                        validCount++;
                        return true;
                    })
                    .map(challenge => {
                        // Extract ID with validation and logging
                        let id = null;
                        if (challenge.hasOwnProperty('id')) {
                            if (typeof challenge.id === 'string' && challenge.id.trim() !== '') {
                                id = challenge.id.trim();
                            } else if (typeof challenge.id === 'number') {
                                id = String(challenge.id);
                            } else {
                                this.logger.warn('Challenge has invalid ID format', {
                                    userId,
                                    idType: typeof challenge.id,
                                    idValue: String(challenge.id).substring(0, 20)
                                });
                            }
                        } else if (challenge.hasOwnProperty('challengeId')) {
                            // Try alternative ID property
                            if (typeof challenge.challengeId === 'string' && challenge.challengeId.trim() !== '') {
                                id = challenge.challengeId.trim();
                            } else if (typeof challenge.challengeId === 'number') {
                                id = String(challenge.challengeId);
                            }
                        }
                        
                        // Extract title with validation
                        let title = 'Untitled Challenge';
                        if (typeof challenge.title === 'string' && challenge.title.trim() !== '') {
                            title = challenge.title.trim();
                        } else if (typeof challenge.name === 'string' && challenge.name.trim() !== '') {
                            title = challenge.name.trim();
                        }
                        
                        // Extract type with validation
                        let type = 'unknown';
                        if (typeof challenge.challengeType === 'string' && challenge.challengeType.trim() !== '') {
                            type = challenge.challengeType.trim();
                        } else if (typeof challenge.type === 'string' && challenge.type.trim() !== '') {
                            type = challenge.type.trim();
                        }
                        
                        // Extract focus area with validation
                        let focusArea = null;
                        if (typeof challenge.focusArea === 'string' && challenge.focusArea.trim() !== '') {
                            focusArea = challenge.focusArea.trim();
                        } else if (typeof challenge.focus_area === 'string' && challenge.focus_area.trim() !== '') {
                            focusArea = challenge.focus_area.trim();
                        } else if (typeof challenge.category === 'string' && challenge.category.trim() !== '') {
                            focusArea = challenge.category.trim();
                        }
                        
                        // Extract completion date with validation
                        let completedAt = null;
                        
                        // Try several possible date fields with validation
                        const dateFields = ['completedAt', 'completed_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'];
                        for (const field of dateFields) {
                            if (challenge[field]) {
                                try {
                                    // Check if it's a valid date string
                                    const date = new Date(challenge[field]);
                                    if (!isNaN(date.getTime())) {
                                        completedAt = challenge[field];
                                        break;
                                    }
                                } catch (e) {
                                    this.logger.debug(`Invalid date format in ${field} for challenge`, {
                                        userId,
                                        challengeId: id || 'unknown',
                                        dateValue: String(challenge[field]).substring(0, 30),
                                        error: e.message
                                    });
                                }
                            }
                        }
                        
                        // Extract difficulty with validation
                        let difficulty = 'intermediate';
                        if (typeof challenge.difficulty === 'string' && challenge.difficulty.trim() !== '') {
                            difficulty = challenge.difficulty.trim();
                        } else if (typeof challenge.level === 'string' && challenge.level.trim() !== '') {
                            difficulty = challenge.level.trim();
                        }
                        
                        // Log missing challenge id as warning
                        if (!id) {
                            this.logger.warn('Challenge missing ID in user context', { 
                                userId, 
                                challengeTitle: title 
                            });
                        }
                        
                        return {
                            id,
                            title,
                            type,
                            focusArea,
                            completedAt,
                            difficulty
                        };
                    });
                
                // Log statistics about challenge processing
                if (invalidCount > 0) {
                    this.logger.warn(`Filtered out ${invalidCount} invalid challenges from user context`, {
                        userId,
                        originalCount,
                        validCount,
                        invalidCount
                    });
                }
                
                // Extract focus area distribution with improved validation
                const focusAreaCounts = new Map();
                
                context.learningJourney.challengeHistory.forEach(challenge => {
                    // Only count challenges with valid focus areas
                    if (challenge.focusArea && typeof challenge.focusArea === 'string') {
                        const normalizedArea = challenge.focusArea.trim().toLowerCase();
                        if (normalizedArea) {
                            focusAreaCounts.set(
                                normalizedArea, 
                                (focusAreaCounts.get(normalizedArea) || 0) + 1
                            );
                        }
                    }
                });
                
                // Sort by count (descending) and convert to array of area names
                const topFocusAreas = Array.from(focusAreaCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([area]) => area);
                
                // Merge with explicit focus areas, avoiding duplicates
                if (topFocusAreas.length > 0) {
                    const existingFocusAreas = new Set(
                        context.learningJourney.focusAreas.map(area => 
                            typeof area === 'string' ? area.trim().toLowerCase() : '')
                    );
                    
                    topFocusAreas.forEach(area => {
                        // Skip empty areas and duplicates (case-insensitive)
                        if (area && !existingFocusAreas.has(area)) {
                            context.learningJourney.focusAreas.push(area);
                            existingFocusAreas.add(area);
                        }
                    });
                }
                
                // Log focus area statistics
                this.logger.debug('Extracted focus areas from challenge history', {
                    userId,
                    focusAreaCount: focusAreaCounts.size,
                    topAreas: topFocusAreas.slice(0, 3).join(', ')
                });
            }
        } catch (challengeError) {
            // Enhanced error handling with additional context
            this.logger.warn('Error fetching challenge history for context', {
                userId,
                operation: 'challengeRepository.getChallengesByUserId',
                errorType: challengeError.name || 'Unknown',
                error: challengeError.message,
                stack: challengeError.stack
            });
            
            // Convert to domain-specific error for better error handling up the stack
            if (challengeError instanceof EvaluationError) {
                throw challengeError; // Already a domain error, just re-throw
            } else {
                throw new EvaluationProcessingError(
                    `Failed to fetch challenge history: ${challengeError.message}`,
                    { cause: challengeError }
                );
            }
        }

        // Get evaluation history - Using repository directly for CQRS read pattern
        try {
            const recentEvaluations = await this.evaluationRepository.getEvaluationsByUserId(userId, {
                limit: COLLECTION_LIMITS.EVALUATIONS,
                sort: 'createdAt:desc',
            });
            
            // Validate repository response format
            if (!recentEvaluations) {
                this.logger.debug('No evaluation history found', { userId });
            } else if (!Array.isArray(recentEvaluations)) {
                this.logger.warn('Invalid evaluation history data type', { 
                    userId, 
                    dataType: typeof recentEvaluations,
                    repositoryMethod: 'evaluationRepository.getEvaluationsByUserId'
                });
                throw new EvaluationProcessingError(`Invalid evaluation history format: expected array, got ${typeof recentEvaluations}`);
            } else if (recentEvaluations.length > 0) {
                // Process evaluation metrics
                let totalScore = 0;
                let validScoreCount = 0;
                const categoryCounts = {};
                const categoryScores = {};
                const strengths = new Map();
                const weaknesses = new Map();
                
                recentEvaluations.forEach(evaluation => {
                    // Validate evaluation object
                    if (!evaluation || typeof evaluation !== 'object') {
                        this.logger.warn('Invalid evaluation item in user context', { 
                            userId,
                            evaluationType: typeof evaluation
                        });
                        return; // Skip this evaluation
                    }
                    
                    // Track overall scores with enhanced validation
                    let score = null;
                    
                    if (evaluation.hasOwnProperty('score')) {
                        // Try to convert to a valid number if it exists
                        score = Number(evaluation.score);
                        
                        if (isNaN(score)) {
                            this.logger.warn('Invalid evaluation score (not a number) in user context', { 
                                userId, 
                                evaluationId: evaluation?.id || 'unknown',
                                invalidScore: evaluation.score,
                                scoreType: typeof evaluation.score
                            });
                        } else if (score < 0 || score > 100) {
                            this.logger.warn('Evaluation score out of expected range (0-100)', {
                                userId,
                                evaluationId: evaluation?.id || 'unknown',
                                outOfRangeScore: score
                            });
                            // We'll still use it, but log the warning
                            totalScore += score;
                            validScoreCount++;
                        } else {
                            totalScore += score;
                            validScoreCount++;
                        }
                    } else {
                        this.logger.debug('Evaluation missing score property', {
                            userId,
                            evaluationId: evaluation?.id || 'unknown'
                        });
                    }
                    
                    // Process category scores with enhanced validation
                    if (evaluation.categoryScores) {
                        // Ensure categoryScores is an object before processing
                        if (typeof evaluation.categoryScores !== 'object' || evaluation.categoryScores === null) {
                            this.logger.warn('Invalid categoryScores format in evaluation', {
                                userId,
                                evaluationId: evaluation?.id || 'unknown',
                                categoryScoresType: typeof evaluation.categoryScores
                            });
                        } else {
                            // Process each category score with validation
                            Object.entries(evaluation.categoryScores).forEach(([category, scoreValue]) => {
                                // Validate category key
                                if (!category || typeof category !== 'string') {
                                    this.logger.warn('Invalid category key in evaluation', {
                                        userId,
                                        evaluationId: evaluation?.id || 'unknown',
                                        invalidCategory: category
                                    });
                                    return; // Skip this entry
                                }
                                
                                // Validate and convert the score
                                const categoryScore = Number(scoreValue);
                                if (isNaN(categoryScore)) {
                                    this.logger.warn('Invalid category score value in evaluation', {
                                        userId,
                                        evaluationId: evaluation?.id || 'unknown',
                                        category,
                                        invalidScore: scoreValue,
                                        scoreType: typeof scoreValue
                                    });
                                    return; // Skip this entry
                                }
                                
                                // Initialize array if doesn't exist
                                if (!categoryScores[category]) {
                                    categoryScores[category] = [];
                                }
                                
                                // Add valid score to our tracking
                                categoryScores[category].push(categoryScore);
                                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                                
                                // Track strengths and weaknesses with threshold validation
                                if (categoryScore >= SKILL_THRESHOLDS.STRENGTH) {
                                    if (!strengths.has(category)) {
                                        strengths.set(category, 0);
                                    }
                                    strengths.set(category, strengths.get(category) + 1);
                                } else if (categoryScore <= SKILL_THRESHOLDS.WEAKNESS) {
                                    if (!weaknesses.has(category)) {
                                        weaknesses.set(category, 0);
                                    }
                                    weaknesses.set(category, weaknesses.get(category) + 1);
                                }
                            });
                        }
                    }
                    
                    // Add to evaluation history with guaranteed safety
                    const safeEvaluation = {
                        evaluationId: evaluation?.id || null,
                        challengeId: evaluation?.challengeId || null,
                        score: Number.isFinite(score) ? score : 0,
                        createdAt: evaluation?.createdAt || null,
                        // Guarantee arrays even if source is missing or not an array
                        strengths: Array.isArray(evaluation?.strengths) ? evaluation.strengths : [],
                        areasForImprovement: Array.isArray(evaluation?.areasForImprovement) ? evaluation.areasForImprovement : [],
                        // Guarantee object even if source is missing or not an object
                        categoryScores: (evaluation?.categoryScores && typeof evaluation.categoryScores === 'object') 
                                       ? { ...evaluation.categoryScores } : {}
                    };
                    
                    context.learningJourney.evaluationHistory.push(safeEvaluation);
                });
                
                // Calculate average scores per category with validation
                const avgCategoryScores = {};
                Object.entries(categoryScores).forEach(([category, scores]) => {
                    if (Array.isArray(scores) && scores.length > 0) {
                        // Calculate average with extra validation
                        const validScores = scores.filter(s => Number.isFinite(s));
                        if (validScores.length > 0) {
                            avgCategoryScores[category] = Math.round(
                                validScores.reduce((sum, score) => sum + score, 0) / validScores.length
                            );
                        } else {
                            this.logger.warn('No valid scores for category', {
                                userId,
                                category,
                                originalScoresCount: scores.length
                            });
                            // Provide a default/fallback value
                            avgCategoryScores[category] = 0;
                        }
                    }
                });
                
                // Set skill levels based on validated category averages
                context.learningJourney.skillLevels = avgCategoryScores;
                
                // Find consistent strengths with threshold validation
                const consistentStrengths = [...strengths.entries()]
                    .filter(([_, count]) => count >= CONSISTENCY_THRESHOLD.MINIMUM_OCCURRENCES)
                    .map(([category]) => category);
                
                // Find persistent weaknesses with threshold validation
                const persistentWeaknesses = [...weaknesses.entries()]
                    .filter(([_, count]) => count >= CONSISTENCY_THRESHOLD.MINIMUM_OCCURRENCES)
                    .map(([category]) => category);
                
                context.strengths = consistentStrengths;
                context.areasForGrowth = persistentWeaknesses;
                
                // Calculate average score with validation
                if (validScoreCount > 0) {
                    context.learningJourney.averageScore = Math.round(totalScore / validScoreCount);
                } else {
                    context.learningJourney.averageScore = 0;
                    this.logger.debug('No valid evaluation scores found for average calculation', { userId });
                }
            }
        } catch (evaluationError) {
            // Enhanced error handling with additional context
            this.logger.warn('Error fetching evaluation history for context', {
                userId,
                operation: 'evaluationRepository.getEvaluationsByUserId',
                errorType: evaluationError.name || 'Unknown',
                error: evaluationError.message,
                stack: evaluationError.stack
            });
            
            // Convert to domain-specific error with proper context
            if (evaluationError instanceof EvaluationError) {
                throw evaluationError; // Already a domain error, just re-throw
            } else {
                throw new EvaluationProcessingError(
                    `Failed to fetch evaluation history: ${evaluationError.message}`,
                    { cause: evaluationError }
                );
            }
        }

        // Add session context if provided
        if (options.sessionContext && typeof options.sessionContext === 'object') {
            context.sessionContext = { ...options.sessionContext };
        }

        this.logger.debug('User context gathered successfully', {
            userId,
            contextSize: JSON.stringify(context).length,
            focusAreasCount: context.learningJourney.focusAreas.length,
            challengesCount: context.learningJourney.challengeHistory.length,
            evaluationsCount: context.learningJourney.evaluationHistory.length
        });

        return context;
    }

    /**
     * Extract user-specific evaluation criteria based on their context
     *
     * @param {Object} userContext - User context object
     * @param {Object} challenge - Challenge being evaluated
     * @returns {Object} Personalized evaluation criteria
     */
    async extractPersonalizedCriteria(userContext, challenge) {
        const criteria = {
            categoryWeights: {},
            focusAreas: [],
            skillLevel: 'intermediate',
            learningGoals: [],
            previousScores: {},
            consistentStrengths: [],
            persistentWeaknesses: [],
        };

        // Extract basic info
        criteria.skillLevel = userContext?.profile?.skillLevel || 'intermediate';
        criteria.focusAreas = userContext?.learningJourney?.focusAreas || [];
        criteria.learningGoals = userContext?.profile?.learningGoals || [];

        // Get strengths and weaknesses
        criteria.consistentStrengths = userContext?.strengths || [];
        criteria.persistentWeaknesses = userContext?.areasForGrowth || [];

        // Get previous scores for improvement tracking
        const previousEvaluations = userContext?.learningJourney?.evaluationHistory || [];
        if (previousEvaluations.length > 0) {
            // Get most recent evaluation
            const mostRecent = previousEvaluations[0];
            criteria.previousScores.overall = mostRecent.score;
            
            // Add category scores
            if (mostRecent.categoryScores) {
                Object.entries(mostRecent.categoryScores).forEach(([category, score]) => {
                    criteria.previousScores[category] = score;
                });
            }
        }

        // Customize category weights based on focus areas and history
        const defaultWeights = await this.getDefaultCategoryWeights(challenge);
        criteria.categoryWeights = { ...defaultWeights };

        // Adjust weights based on persistent weaknesses - emphasize areas that need improvement
        criteria.persistentWeaknesses.forEach(weakness => {
            if (criteria.categoryWeights[weakness]) {
                // Increase weight for areas needing improvement
                criteria.categoryWeights[weakness] += WEIGHT_NORMALIZATION.WEAKNESS_ADJUSTMENT;
            }
        });

        // Normalize weights to sum to 100
        const totalWeight = Object.values(criteria.categoryWeights).reduce((sum, w) => sum + w, 0);
        if (totalWeight > 0 && totalWeight !== WEIGHT_NORMALIZATION.TARGET_SUM) {
            const factor = WEIGHT_NORMALIZATION.TARGET_SUM / totalWeight;
            Object.keys(criteria.categoryWeights).forEach(key => {
                criteria.categoryWeights[key] = Math.round(criteria.categoryWeights[key] * factor);
            });
        }

        return criteria;
    }

    /**
     * Get default category weights based on challenge type
     * @param {Object} challenge - Challenge object
     * @returns {Object} Default weights
     */
    async getDefaultCategoryWeights(challenge) {
        const challengeType = challenge?.challengeType || challenge?.type || 'standard';
        const focusArea = challenge?.focusArea || 'general';

        // Select appropriate category weights based on challenge type and focus area
        if (challengeType.toLowerCase() === 'analysis') {
            return DEFAULT_CATEGORY_WEIGHTS.ANALYSIS;
        } 
        else if (challengeType.toLowerCase() === 'scenario') {
            return DEFAULT_CATEGORY_WEIGHTS.SCENARIO;
        }
        else if (focusArea?.toLowerCase().includes('ethics')) {
            return DEFAULT_CATEGORY_WEIGHTS.ETHICS;
        }
        
        // Default to standard weights
        return DEFAULT_CATEGORY_WEIGHTS.STANDARD;
    }
}

export { UserContextService };
export default UserContextService; 