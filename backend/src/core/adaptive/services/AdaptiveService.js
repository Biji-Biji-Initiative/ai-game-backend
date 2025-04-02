import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { AdaptiveError, AdaptiveValidationError } from "#app/core/adaptive/errors/adaptiveErrors.js";
import { v4 as uuidv4 } from "uuid";
import Recommendation from "#app/core/adaptive/models/Recommendation.js"; // Import the model
import Difficulty from "#app/core/adaptive/models/Difficulty.js"; // Import Difficulty model

/**
 * Service for handling adaptive learning operations
 */
class AdaptiveService {
    /**
     * Constructor
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.adaptiveRepository - Repository for adaptive data
     * @param {Object} dependencies.progressService - Service for user progress data
     * @param {Object} dependencies.personalityService - Service for personality data
     * @param {Object} dependencies.challengeConfigService - Service for challenge config (Added)
     * @param {Object} dependencies.challengePersonalizationService - Service for personalization logic (Added)
     * @param {Object} dependencies.userService - Service for user operations (Added)
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.cacheService - Cache service for optimizing data access
     */
    constructor(dependencies = {}) {
        const {
            adaptiveRepository, 
            progressService, 
            personalityService, 
            challengeConfigService,      // Added
            challengePersonalizationService, // Added
            userService,                 // Added
            logger, 
            cacheService 
        } = dependencies;
        
        // Validate dependencies
        if (!adaptiveRepository) throw new AdaptiveError('adaptiveRepository is required');
        if (!progressService) throw new AdaptiveError('progressService is required'); 
        if (!personalityService) throw new AdaptiveError('personalityService is required');
        if (!challengeConfigService) throw new AdaptiveError('challengeConfigService is required');
        if (!challengePersonalizationService) throw new AdaptiveError('challengePersonalizationService is required');
        if (!userService) throw new AdaptiveError('userService is required'); // Added validation
        
        this.repository = adaptiveRepository;
        this.progressService = progressService;
        this.personalityService = personalityService;
        this.challengeConfigService = challengeConfigService; // Added
        this.challengePersonalizationService = challengePersonalizationService; // Added
        this.userService = userService; // Added
        this.logger = logger || console;
        this.cache = cacheService;
        
        // Create error mapper for adaptive service
        const errorMapper = createErrorMapper({
            Error: AdaptiveError
        }, AdaptiveError);
        
        // Apply standardized error handling to methods
        this.getLatestRecommendations = withServiceErrorHandling(this.getLatestRecommendations.bind(this), { methodName: 'getLatestRecommendations', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.generateChallenge = withServiceErrorHandling(this.generateChallenge.bind(this), { methodName: 'generateChallenge', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.adjustDifficulty = withServiceErrorHandling(this.adjustDifficulty.bind(this), { methodName: 'adjustDifficulty', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.calculateDifficulty = withServiceErrorHandling(this.calculateDifficulty.bind(this), { methodName: 'calculateDifficulty', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.invalidateUserCaches = withServiceErrorHandling(this.invalidateUserCaches.bind(this), { methodName: 'invalidateUserCaches', domainName: 'adaptive', logger: this.logger, errorMapper });
    }
    /**
     * Get personalized recommendations for a user
     * @param {string} userId - User ID
     * @param {Object} options - Additional options
     * @returns {Promise<Recommendation|null>} Latest recommendation object or null
     */
    async getLatestRecommendations(userId, options = {}) {
        if (!userId) {
            throw new AdaptiveValidationError('User ID is required for recommendations');
        }
        this.logger.info('Getting latest recommendations', { userId });

        const cacheKey = `recommendations:latest:${userId}`;
        
        const fetchAndGenerate = async () => {
            // Attempt to fetch the latest existing recommendation first
            const latestExisting = await this.repository.findLatestForUser(userId);
            if (latestExisting) {
                 this.logger.debug('Found existing latest recommendation', { userId, recommendationId: latestExisting.id });
                 return latestExisting; 
            }
            
            // If none exists, generate a new one
            this.logger.info('No existing recommendation found, generating new one', { userId });
            return this.generateAndSaveRecommendations(userId, options);
        };

        if (this.cache) {
            return this.cache.getOrSet(cacheKey, fetchAndGenerate, 300); // Cache for 5 minutes
        } else {
            return fetchAndGenerate();
        }
    }
    /**
     * Generates and saves new recommendations for a user.
     * @param {string} userId - User ID
     * @param {Object} options - Additional options
     * @returns {Promise<Recommendation>} The newly generated and saved recommendation
     * @private
     */
    async generateAndSaveRecommendations(userId, _options) {
        // 1. Fetch required data (Progress, Personality)
        let userProgress = null;
        let userPersonality = null;
        try {
            userProgress = await this.progressService.getOrCreateProgress(userId);
            userPersonality = await this.personalityService.getProfile(userId);
        } catch (error) {
            this.logger.error('Failed to fetch data for recommendation generation', { userId, error: error.message });
            throw new AdaptiveError('Could not generate recommendations due to missing user data', { cause: error });
        }

        // 2. **[Placeholder]** Analyze data and determine recommendations
        // In a real implementation, this would involve complex logic or algorithms
        this.logger.debug('Analyzing user data for recommendations (Placeholder)', { userId });
        const recommendedFocusAreas = userProgress?.focusArea ? [userProgress.focusArea, 'AI_Ethics'] : ['AI_Ethics', 'Prompt_Engineering'];
        const recommendedChallengeTypes = userPersonality?.dominantTraits?.includes('Analytical') ? ['debugging', 'optimization'] : ['implementation', 'design'];
        const suggestedLearningResources = [
            { title: 'Intro to AI Safety', url: '/resource/ai-safety', type: 'article' },
        ];
        const strengths = userProgress?.strengths || [];
        const weaknesses = userProgress?.weaknesses || [];
        
        // 3. Create Recommendation domain object
        const recommendationData = {
             id: uuidv4(), // Generate new ID
             userId: userId,
             createdAt: new Date().toISOString(),
             recommendedFocusAreas,
             recommendedChallengeTypes,
             suggestedLearningResources,
             strengths,
             weaknesses,
             metadata: { generationSource: 'AdaptiveServicePlaceholder' }
        };
        const recommendation = new Recommendation(recommendationData);
        
        // 4. Save the new recommendation via repository
        try {
            this.logger.info('Saving newly generated recommendation', { userId, recommendationId: recommendation.id });
            const savedRecommendation = await this.repository.save(recommendation);
            
            // Invalidate cache after saving
            if (this.cache) {
                await this.invalidateUserCaches(userId);
            }
            return savedRecommendation;
        } catch (error) {
            this.logger.error('Failed to save generated recommendation', { userId, error: error.message });
            throw new AdaptiveError('Failed to save generated recommendation', { cause: error });
        }
    }
    /**
     * Generate a personalized challenge
     * @param {string} userId - User ID
     * @param {Object} options - Challenge generation options
     * @returns {Promise<Object>} Generated challenge parameters
     */
    async generateChallenge(userId, options = {}) {
        if (!userId) {
            throw new AdaptiveValidationError('User ID is required for challenge generation');
        }
        this.logger.info('Generating personalized challenge parameters', { userId, options });

        // 1. Fetch User Data (Personality, Progress/History)
        const personality = await this.personalityService.getProfile(userId);
        // Fetch recent progress or completed challenges to inform difficulty/topic
        const progress = await this.progressService.getProgress(userId);
        // Simplistic approach: Use overall focus area if defined, else a default
        const focusAreaCode = options.focusArea || progress?.focusArea || personality?.focusArea || 'general'; 

        // 2. Determine Challenge Type using Personalization Service
        const dominantTraits = personality?.dominantTraits || [];
        // Note: focusAreas for selection might be different from the single code above
        const userFocusAreas = progress?.focusAreas || (focusAreaCode !== 'general' ? [focusAreaCode] : []);
        const challengeType = await this.challengePersonalizationService.selectChallengeType(dominantTraits, userFocusAreas);
        
        // 3. Determine Difficulty Level
        // Use progress history or fallback
        const recentScore = progress?.statistics?.averageScore; // Example: use average score
        let difficultyCode = 'intermediate'; // Default
        if (recentScore !== undefined && recentScore !== null) {
            difficultyCode = this.challengePersonalizationService.determineDifficulty(recentScore);
        } else if (personality?.skillLevel) {
            // Map personality skill level (if available) to difficulty? Needs defining.
            // difficultyCode = mapSkillToDifficulty(personality.skillLevel); 
        }
        // Ensure the determined difficulty exists
        const difficultyLevel = await this.challengeConfigService.getDifficultyLevel(difficultyCode).catch(() => null);
        difficultyCode = difficultyLevel?.code || 'intermediate'; // Fallback if lookup failed
        
        // 4. Select Format Type (can be simple for now, or based on challenge type)
        const availableFormats = await this.challengeConfigService.getAllFormatTypes();
        let formatTypeCode = options.formatType || challengeType?.defaultFormatTypeCode || availableFormats[0]?.code || 'code'; // Example logic
        
        // 5. Assemble parameters
        const challengeParams = {
            userId: userId,
            focusArea: focusAreaCode,
            challengeType: challengeType.code,
            formatType: formatTypeCode,
            difficulty: difficultyCode,
            // Optional: Add more context from personality/progress if needed by generation service
            // e.g., userContext: { skillLevel: personality?.skillLevel, traits: dominantTraits } 
        };
        
        this.logger.info('Generated challenge parameters', { userId, params: challengeParams });

        // NOTE: This service returns the *parameters* for generation.
        // Another service (e.g., ChallengeGenerationService or a Coordinator)
        // would take these params, call the AI/content source, create the Challenge domain object,
        // and save it via challengeRepository.save().
        return challengeParams; 
    }
    /**
     * Adjust difficulty based on user performance
     * @param {string} userId - User ID
     * @param {Object} performanceData - User performance data (e.g., { challengeId: 'xyz', score: 85 })
     * @returns {Promise<Difficulty>} Updated difficulty settings object
     */
    async adjustDifficulty(userId, performanceData) {
        if (!userId) {
            throw new AdaptiveValidationError('User ID is required for difficulty adjustment');
        }
        if (!performanceData || typeof performanceData !== 'object') {
            throw new AdaptiveValidationError('Performance data is required and must be an object');
        }
        if (performanceData.score === undefined || performanceData.score === null) {
             throw new AdaptiveValidationError('Performance data must include a score');
        }
        
        this.logger.info('Adjusting difficulty based on performance', { userId, performanceData });

        // 1. Get current user difficulty/progress if available
        // Fetch user to get current difficulty (or use progress)
        const user = await this.userService.getUserById(userId);
        const currentDifficultyLevel = user?.difficultyLevel;

        // 2. Create a Difficulty object representing current state
        let currentDifficulty = new Difficulty(currentDifficultyLevel); // Initialize with current level if exists
        this.logger.debug('Current difficulty state before adjustment', { userId, level: currentDifficulty.getCode(), percent: currentDifficulty.getPercentage() });

        // 3. Adjust based on the new score using Difficulty model logic
        currentDifficulty.adjustBasedOnScore(performanceData.score);
        const newLevelCode = currentDifficulty.getCode();
        this.logger.info('Adjusted difficulty state calculated', { userId, newLevel: newLevelCode, newPercent: currentDifficulty.getPercentage() });
        
        // 4. Persist the new difficulty state using UserService
        try {
            await this.userService.updateUserDifficulty(userId, newLevelCode);
            this.logger.info('Successfully persisted updated difficulty level for user', { userId, newLevelCode });
        } catch (error) {
            // Log the error but don't necessarily block returning the calculated difficulty
            this.logger.error('Failed to persist updated difficulty level', { userId, newLevelCode, error: error.message, stack: error.stack });
            // Depending on requirements, you might re-throw or just log and continue.
            // throw new AdaptiveError('Failed to save updated difficulty', { cause: error });
        }

        // Return the calculated Difficulty object itself
        return currentDifficulty; 
    }
    /**
     * Calculate optimal difficulty level for a user, potentially for a specific challenge type.
     * @param {string} userId - User ID
     * @param {string} [challengeTypeCode] - Optional challenge type to consider
     * @returns {Promise<Difficulty>} Optimal difficulty settings object
     */
    async calculateDifficulty(userId, challengeTypeCode = null) {
        if (!userId) {
            throw new AdaptiveValidationError('User ID is required for difficulty calculation');
        }
        this.logger.info('Calculating optimal difficulty', { userId, challengeTypeCode });

        // Cache key specific to user and potentially type
        const cacheKey = `adaptive:optimalDifficulty:${userId}${challengeTypeCode ? `:${challengeTypeCode}` : ''}`;
        
        const calculateLogic = async () => {
            // 1. Fetch user progress and personality
            const progress = await this.progressService.getOrCreateProgress(userId);
            const personality = await this.personalityService.getProfile(userId);

            // 2. Base difficulty on progress (e.g., average score)
            let difficulty = new Difficulty(); // Default
            const avgScore = progress?.statistics?.averageScore;
            if (avgScore !== undefined && avgScore !== null) {
                 difficulty.setFromAbsoluteScore(avgScore);
            }
            
            // 3. [Placeholder] Adjust based on personality traits (using personalization service?)
            // Example: If dominant trait is 'Cautious', maybe slightly decrease difficulty percentage?
            // const dominantTraits = personality?.dominantTraits || [];
            // difficulty = this.challengePersonalizationService.adjustDifficultyForTraits(difficulty, dominantTraits);

            // 4. [Placeholder] Adjust based on challenge type (using config service?)
            // Example: If type is 'debugging', maybe increase slightly?
            // if (challengeTypeCode) {
            //    const typeConfig = await this.challengeConfigService.getChallengeType(challengeTypeCode);
            //    difficulty = difficulty.adjustForType(typeConfig); // Needs implementation in Difficulty model
            // }
            
            this.logger.info('Calculated optimal difficulty', { userId, level: difficulty.getCode(), percent: difficulty.getPercentage() });
            return difficulty; // Return the Difficulty object
        };

        if (this.cache) {
            // Return cached value or calculate, cache, and return
            return this.cache.getOrSet(cacheKey, calculateLogic, 1800); // Cache for 30 minutes
        } else {
            // Calculate directly if no cache
            return calculateLogic();
        }
    }
    /**
     * Invalidate all adaptive caches for a user
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    invalidateUserCaches(userId) {
        if (!userId || !this.cache) {
            return;
        }
        try {
            // Get all keys for this user
            const userKeys = this.cache.keys(`user:${userId}`);
            const recommendationKeys = this.cache.keys(`recommendations:user:${userId}`);
            // Delete all matching keys
            [...userKeys, ...recommendationKeys].forEach(key => {
                this.cache.delete(key);
            });
            this.logger.debug(`Invalidated ${userKeys.length + recommendationKeys.length} adaptive cache entries for user`, {
                userId
            });
        }
        catch (error) {
            this.logger.warn('Error invalidating adaptive caches', {
                error: error.message,
                userId
            });
            // Don't rethrow - this is a non-critical operation
        }
    }
}
export default AdaptiveService;
