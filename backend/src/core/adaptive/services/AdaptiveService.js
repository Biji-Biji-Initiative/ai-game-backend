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
    async generateAndSaveRecommendations(userId, options = {}) {
        // 1. Fetch required data (Progress, Personality)
        let userProgress = null;
        let userPersonality = null;
        try {
            userProgress = await this.progressService.getOrCreateProgress(userId);
            userPersonality = await this.personalityService.getProfile(userId);
            
            // Also fetch user profile for more context
            const user = await this.userService.getUserById(userId);
            
            this.logger.debug('Retrieved user data for recommendation analysis', { 
                userId, 
                hasProgress: !!userProgress, 
                hasPersonality: !!userPersonality, 
                hasUser: !!user 
            });
        } catch (error) {
            this.logger.error('Failed to fetch data for recommendation generation', { userId, error: error.message });
            throw new AdaptiveError('Could not generate recommendations due to missing user data', { cause: error });
        }

        // 2. Analyze data and determine recommendations
        this.logger.debug('Analyzing user data for intelligent recommendations', { userId });
        
        // --- Focus Area Recommendations ---
        let recommendedFocusAreas = [];
        
        // Method 1: Identify skill gaps based on statistics
        if (userProgress?.skillLevels) {
            // Get skills with lowest scores, they need the most improvement
            const skillEntries = Object.entries(userProgress.skillLevels || {});
            const weakestSkills = skillEntries
                .filter(([_, value]) => typeof value === 'number') // Ensure we have numeric values
                .sort(([_key1, valueA], [_key2, valueB]) => valueA - valueB) // Sort ascending by score
                .slice(0, 2) // Get 2 weakest skills
                .map(([key]) => key); // Extract skill names
                
            if (weakestSkills.length > 0) {
                // Convert skill names to focus area codes if needed
                const focusAreasFromWeakSkills = await this._mapSkillsToFocusAreas(weakestSkills);
                recommendedFocusAreas.push(...focusAreasFromWeakSkills);
            }
        }
        
        // Method 2: Consider personality traits
        if (userPersonality?.dominantTraits) {
            const dominantTraits = userPersonality.dominantTraits;
            
            // Get all focus areas from configuration
            const allFocusAreas = await this.challengeConfigService.getAllFocusAreas();
            const traitMappings = await this.challengeConfigService.getTraitMappings();
            
            // Match traits to focus areas using mappings
            const focusAreasFromTraits = dominantTraits
                .flatMap(trait => {
                    const mappedFocusAreas = (traitMappings[trait] || [])
                        .filter(code => allFocusAreas.some(area => area.code === code));
                    return mappedFocusAreas;
                })
                .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
                
            recommendedFocusAreas.push(...focusAreasFromTraits);
        }
        
        // Method 3: Include current focus area for continuity if it exists
        if (userProgress?.focusArea && recommendedFocusAreas.length < 3) {
            recommendedFocusAreas.push(userProgress.focusArea);
        }
        
        // Method 4: Fill gaps with trending/popular focus areas if needed
        if (recommendedFocusAreas.length < 2) {
            const trendingFocusAreas = ['AI_Ethics', 'Prompt_Engineering', 'RAG', 'LLM_Training'];
            const remaining = trendingFocusAreas
                .filter(area => !recommendedFocusAreas.includes(area))
                .slice(0, 3 - recommendedFocusAreas.length);
            recommendedFocusAreas.push(...remaining);
        }
        
        // Remove duplicates and limit to 3
        recommendedFocusAreas = [...new Set(recommendedFocusAreas)].slice(0, 3);
        
        // --- Challenge Type Recommendations ---
        let recommendedChallengeTypes = [];
        
        // Method 1: Match personality traits to challenge types using personalization service
        if (userPersonality?.dominantTraits) {
            try {
                // Get user's focus areas for the personalization logic
                const userFocusAreas = recommendedFocusAreas.slice(0, 2);
                
                // Use challengePersonalizationService to select a suitable type
                const selectedType = await this.challengePersonalizationService.selectChallengeType(
                    userPersonality.dominantTraits, 
                    userFocusAreas
                );
                
                if (selectedType?.code) {
                    recommendedChallengeTypes.push(selectedType.code);
                    
                    // Also get related challenge types if available
                    if (selectedType.relatedTypes) {
                        recommendedChallengeTypes.push(...selectedType.relatedTypes.slice(0, 2));
                    }
                }
            } catch (error) {
                this.logger.warn('Error selecting challenge type from traits, using fallback', { 
                    userId, 
                    error: error.message 
                });
            }
        }
        
        // Method 2: Analyze past successful challenges from progress history
        if (userProgress?.completedChallenges && userProgress.completedChallenges.length > 0) {
            const successfulChallenges = userProgress.completedChallenges
                .filter(challenge => challenge.score && challenge.score >= 70)
                .sort((a, b) => b.score - a.score); // Sort by score descending
                
            const topChallengeTypes = successfulChallenges
                .map(challenge => challenge.challengeType)
                .filter(Boolean)
                .reduce((acc, type) => {
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {});
                
            // Get the most successful types (highest frequency)
            const successTypes = Object.entries(topChallengeTypes)
                .sort(([_type1, countA], [_type2, countB]) => countB - countA)
                .slice(0, 2)
                .map(([type]) => type);
                
            recommendedChallengeTypes.push(...successTypes);
        }
        
        // Method 3: Fill gaps with default types if needed
        if (recommendedChallengeTypes.length < 2) {
            const defaultTypes = ['implementation', 'debugging', 'design', 'analysis'];
            const remaining = defaultTypes
                .filter(type => !recommendedChallengeTypes.includes(type))
                .slice(0, 3 - recommendedChallengeTypes.length);
            recommendedChallengeTypes.push(...remaining);
        }
        
        // Remove duplicates and limit to 3
        recommendedChallengeTypes = [...new Set(recommendedChallengeTypes)].slice(0, 3);
        
        // --- Learning Resources ---
        // Generate tailored resource recommendations based on focus areas and challenge types
        const suggestedLearningResources = await this._generateResourceRecommendations(
            recommendedFocusAreas,
            recommendedChallengeTypes,
            userPersonality?.dominantTraits || []
        );
        
        // --- Strengths & Weaknesses ---
        // Use existing values from progress if available, otherwise derive from skillLevels
        const strengths = userProgress?.strengths || this._deriveStrengthsFromSkills(userProgress?.skillLevels);
        const weaknesses = userProgress?.weaknesses || this._deriveWeaknessesFromSkills(userProgress?.skillLevels);
        
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
             metadata: { 
                 generationSource: 'AdaptiveServiceDynamic',
                 generationTimestamp: new Date().toISOString(),
                 traitFactors: userPersonality?.dominantTraits || [],
                 basedOnSkillLevels: !!userProgress?.skillLevels,
                 basedOnHistory: userProgress?.completedChallenges?.length > 0
             }
        };
        
        const recommendation = new Recommendation(recommendationData);
        
        // 4. Save the new recommendation via repository
        try {
            this.logger.info('Saving newly generated recommendation', { 
                userId, 
                recommendationId: recommendation.id,
                focusAreas: recommendedFocusAreas,
                challengeTypes: recommendedChallengeTypes
            });
            
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
     * Helper method to map skill names to focus area codes
     * @param {string[]} skills - Skill names or codes
     * @returns {Promise<string[]>} Mapped focus area codes
     * @private
     */
    async _mapSkillsToFocusAreas(skills) {
        // This is a simplified mapping - in a real implementation, you might have
        // a more sophisticated mapping stored in the database or configuration
        try {
            const skillToFocusMap = {
                'prompt_engineering': 'Prompt_Engineering',
                'prompt': 'Prompt_Engineering',
                'prompting': 'Prompt_Engineering',
                'coding': 'Implementation',
                'implementation': 'Implementation',
                'debugging': 'Debugging',
                'problem_solving': 'Problem_Solving',
                'analysis': 'Analysis',
                'systems_design': 'Systems_Design',
                'design': 'Systems_Design',
                'llm': 'LLM_Knowledge',
                'llm_knowledge': 'LLM_Knowledge',
                'ai_ethics': 'AI_Ethics',
                'ethics': 'AI_Ethics',
                'rag': 'RAG',
                'retrieval': 'RAG',
                'fine_tuning': 'Fine_Tuning',
                'optimization': 'Optimization'
            };
            
            return skills
                .map(skill => {
                    // Try exact match first
                    const exactMatch = skillToFocusMap[skill.toLowerCase()];
                    if (exactMatch) return exactMatch;
                    
                    // If no exact match, try partial match
                    const keys = Object.keys(skillToFocusMap);
                    const partialMatchKey = keys.find(key => 
                        skill.toLowerCase().includes(key) || key.includes(skill.toLowerCase())
                    );
                    
                    return partialMatchKey ? skillToFocusMap[partialMatchKey] : skill;
                })
                .filter(Boolean); // Remove any undefined values
        } catch (error) {
            this.logger.warn('Error mapping skills to focus areas', { error: error.message, skills });
            return skills; // Return original skills on error
        }
    }
    
    /**
     * Helper method to generate learning resource recommendations
     * @param {string[]} focusAreas - Focus area codes
     * @param {string[]} challengeTypes - Challenge type codes
     * @param {string[]} traits - Personality traits
     * @returns {Promise<Array<Object>>} Resource recommendations
     * @private
     */
    async _generateResourceRecommendations(focusAreas, challengeTypes, traits) {
        const resources = [];
        const isAnalytical = traits.includes('Analytical');
        const isCreative = traits.includes('Creative');
        
        // Add resources based on focus areas
        if (focusAreas.includes('AI_Ethics')) {
            resources.push({
                title: 'Responsible AI Development Guide',
                url: '/resources/ai-ethics-guide',
                type: isAnalytical ? 'whitepaper' : 'interactive-guide'
            });
        }
        
        if (focusAreas.includes('Prompt_Engineering')) {
            resources.push({
                title: 'Advanced Prompt Engineering Techniques',
                url: '/resources/prompt-engineering',
                type: isAnalytical ? 'tutorial' : 'workshop'
            });
        }
        
        if (focusAreas.includes('RAG')) {
            resources.push({
                title: 'Building Effective RAG Systems',
                url: '/resources/rag-systems',
                type: 'tutorial'
            });
        }
        
        if (focusAreas.includes('Implementation')) {
            resources.push({
                title: 'Implementation Best Practices for AI Features',
                url: '/resources/ai-implementation',
                type: 'guide'
            });
        }
        
        // Add resources based on challenge types
        if (challengeTypes.includes('debugging')) {
            resources.push({
                title: 'Common LLM Integration Bugs & Solutions',
                url: '/resources/llm-debugging',
                type: 'troubleshooting-guide'
            });
        }
        
        if (challengeTypes.includes('design')) {
            resources.push({
                title: 'Designing User-Centric AI Interfaces',
                url: '/resources/ai-ux-design',
                type: isCreative ? 'interactive-workshop' : 'guide'
            });
        }
        
        if (challengeTypes.includes('optimization')) {
            resources.push({
                title: 'Performance Optimization for AI Applications',
                url: '/resources/ai-optimization',
                type: 'tutorial'
            });
        }
        
        // Add generic resources if we don't have enough
        if (resources.length < 2) {
            resources.push({
                title: 'Getting Started with AI Development',
                url: '/resources/ai-development-intro',
                type: 'course'
            });
        }
        
        // Limit to 3 most relevant resources
        return resources.slice(0, 3);
    }
    
    /**
     * Derive strengths from skill levels
     * @param {Object} skillLevels - User's skill levels object
     * @returns {Array<string>} Derived strengths
     * @private
     */
    _deriveStrengthsFromSkills(skillLevels) {
        if (!skillLevels || typeof skillLevels !== 'object') {
            return [];
        }
        
        // Find skills with score above threshold
        const threshold = 75; // Consider skills above 75% as strengths
        
        return Object.entries(skillLevels)
            .filter(([_key, value]) => typeof value === 'number' && value >= threshold)
            .sort(([_key1, valueA], [_key2, valueB]) => valueB - valueA) // Sort descending by score
            .slice(0, 3) // Get top 3 strengths
            .map(([key]) => this._formatSkillName(key)); // Format skill names
    }
    
    /**
     * Derive weaknesses from skill levels
     * @param {Object} skillLevels - User's skill levels object
     * @returns {Array<string>} Derived weaknesses
     * @private
     */
    _deriveWeaknessesFromSkills(skillLevels) {
        if (!skillLevels || typeof skillLevels !== 'object') {
            return [];
        }
        
        // Find skills with score below threshold
        const threshold = 60; // Consider skills below 60% as weaknesses
        
        return Object.entries(skillLevels)
            .filter(([_key, value]) => typeof value === 'number' && value < threshold)
            .sort(([_key1, valueA], [_key2, valueB]) => valueA - valueB) // Sort ascending by score
            .slice(0, 3) // Get bottom 3 skills
            .map(([key]) => this._formatSkillName(key)); // Format skill names
    }
    
    /**
     * Format a skill key into a readable name
     * @param {string} key - Skill key
     * @returns {string} Formatted skill name
     * @private
     */
    _formatSkillName(key) {
        try {
            // Convert camelCase or snake_case to title case words
            return key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^\s+/, '')
                .replace(/\s+/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        } catch (error) {
            return key; // Return original on error
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

        try {
            // 1. Gather all user data needed for decision making
            const [personality, progress, user] = await Promise.all([
                this.personalityService.getProfile(userId).catch(err => {
                    this.logger.warn('Failed to load personality profile, using fallback', { userId, error: err.message });
                    return null;
                }),
                this.progressService.getOrCreateProgress(userId),
                this.userService.getUserById(userId)
            ]);
            
            // 2. Extract key information for our algorithm
            const dominantTraits = personality?.dominantTraits || [];
            const preferences = user?.preferences?.challenges || {};
            const completedChallenges = progress?.completedChallenges || [];
            const skillLevels = progress?.skillLevels || {};
            
            // Log data for decision process
            this.logger.debug('User data for challenge generation', { 
                userId, 
                traits: dominantTraits, 
                hasPreferences: Object.keys(preferences).length > 0,
                completedCount: completedChallenges.length,
                skillLevelCount: Object.keys(skillLevels).length
            });
            
            // 3. Determine Focus Area using multi-factor approach
            const focusAreaCode = await this._determineFocusArea(userId, {
                requestedFocusArea: options.focusArea,
                progressFocusArea: progress?.focusArea,
                personalityFocusArea: personality?.focusArea,
                weaknesses: progress?.weaknesses || [],
                skillLevels,
                completedChallenges,
                preferences
            });
            
            // 4. Determine Challenge Type using a decision tree approach
            const challengeType = await this._determineChallengeType(userId, {
                requestedType: options.challengeType,
                dominantTraits,
                focusArea: focusAreaCode,
                completedChallenges,
                preferences
            });
            
            // 5. Determine Difficulty Level using adaptive algorithm
            const difficultyLevel = await this._determineDifficulty(userId, {
                requestedDifficulty: options.difficulty,
                userDifficulty: user?.difficultyLevel || progress?.currentDifficultyCode,
                recentScore: this._calculateRecentAverageScore(completedChallenges),
                skillLevel: skillLevels[focusAreaCode] || progress?.statistics?.averageScore,
                completedCount: completedChallenges.length,
                personalityTraits: dominantTraits
            });
            
            // 6. Determine Format Type based on challenge type and preferences
            const formatType = await this._determineFormatType(userId, {
                requestedFormat: options.formatType,
                challengeTypeCode: challengeType.code,
                preferences,
                completedChallenges,
                dominantTraits
            });
            
            // 7. Assemble user context with rich information for generation
            const userContext = {
                skillLevels: this._formatSkillLevelsForContext(skillLevels),
                traits: dominantTraits,
                strengths: progress?.strengths || [],
                weaknesses: progress?.weaknesses || [],
                preferredLanguages: preferences?.languages || ["javascript", "python"],
                experienceLevel: this._determineExperienceLevel(completedChallenges.length, Object.values(skillLevels || {})),
                preferredTopics: preferences?.topics || [],
                recentChallenges: this._extractRecentChallengeInfo(completedChallenges, 3),
                adaptiveFactor: difficultyLevel.adaptiveFactor || 0 // From Difficulty model
            };
            
            // 8. Calculate estimated time allocation based on difficulty level
            const timeAllocation = difficultyLevel.timeAllocation || this._calculateBaseTimeAllocation(difficultyLevel.level);
            
            // 9. Assemble complete challenge parameters
            const challengeParams = {
                userId,
                focusArea: focusAreaCode,
                challengeType: challengeType.code,
                formatType: formatType.code || formatType, // Handle both object and string
                difficulty: difficultyLevel.level || difficultyLevel, // Handle both Difficulty object and string
                timeAllocation, // In seconds
                complexity: difficultyLevel.complexity || this._mapDifficultyToComplexity(difficultyLevel.level || difficultyLevel),
                depth: difficultyLevel.depth || this._mapDifficultyToDepth(difficultyLevel.level || difficultyLevel),
                userContext // Rich context for the generator
            };
            
            this.logger.info('Generated challenge parameters', { 
                userId, 
                focusArea: challengeParams.focusArea,
                type: challengeParams.challengeType,
                difficulty: challengeParams.difficulty,
                format: challengeParams.formatType
            });
            
            return challengeParams;
            
        } catch (error) {
            this.logger.error('Error generating challenge parameters', { userId, error: error.message, stack: error.stack });
            throw new AdaptiveError(`Failed to generate challenge parameters: ${error.message}`, { cause: error });
        }
    }
    
    /**
     * Determine the focus area for a challenge using multi-factor approach
     * @param {string} userId - User ID
     * @param {Object} params - Parameters for decision
     * @returns {Promise<string>} Focus area code
     * @private
     */
    async _determineFocusArea(userId, params) {
        const { 
            requestedFocusArea, 
            progressFocusArea, 
            personalityFocusArea,
            weaknesses,
            skillLevels,
            completedChallenges,
            preferences
        } = params;
        
        // Priority 1: Use requested focus area if provided
        if (requestedFocusArea) {
            this.logger.debug('Using explicitly requested focus area', { userId, focusArea: requestedFocusArea });
            return requestedFocusArea;
        }
        
        // Priority 2: Use focus area from user's weaknesses (to improve weak areas)
        if (weaknesses && weaknesses.length > 0) {
            try {
                // Map weakness name to focus area code
                const weaknessMappings = await this._mapSkillsToFocusAreas(weaknesses);
                if (weaknessMappings.length > 0) {
                    // Choose one weakness randomly to focus on
                    const weaknessIndex = Math.floor(Math.random() * weaknessMappings.length);
                    const focusArea = weaknessMappings[weaknessIndex];
                    this.logger.debug('Selected focus area from user weaknesses', { userId, weakness: weaknesses[weaknessIndex], focusArea });
                    return focusArea;
                }
            } catch (error) {
                this.logger.warn('Error mapping weaknesses to focus areas', { userId, error: error.message });
                // Continue to next priority if mapping fails
            }
        }
        
        // Priority 3: Identify skills with lowest levels that need improvement
        if (skillLevels && Object.keys(skillLevels).length > 0) {
            const skillEntries = Object.entries(skillLevels);
            if (skillEntries.length > 0) {
                // Sort by score ascending (lowest first)
                skillEntries.sort(([_key1, valueA], [_key2, valueB]) => valueA - valueB);
                
                // Map the weakest skill to a focus area
                const weakestSkill = skillEntries[0][0];
                const mappedAreas = await this._mapSkillsToFocusAreas([weakestSkill]);
                
                if (mappedAreas.length > 0) {
                    this.logger.debug('Selected focus area from lowest skill level', { userId, skill: weakestSkill, focusArea: mappedAreas[0] });
                    return mappedAreas[0];
                }
            }
        }
        
        // Priority 4: Find less frequently practiced focus areas
        if (completedChallenges && completedChallenges.length > 0) {
            // Get all available focus areas
            const allFocusAreas = await this.challengeConfigService.getAllFocusAreas();
            if (allFocusAreas && allFocusAreas.length > 0) {
                // Count occurrences of each focus area
                const focusAreaCounts = completedChallenges.reduce((counts, challenge) => {
                    const area = challenge.focusArea;
                    if (area) counts[area] = (counts[area] || 0) + 1;
                    return counts;
                }, {});
                
                // Find areas with low or no counts
                const lessPracticedAreas = allFocusAreas
                    .filter(area => !focusAreaCounts[area.code] || focusAreaCounts[area.code] < 2)
                    .map(area => area.code);
                    
                if (lessPracticedAreas.length > 0) {
                    // Choose one randomly
                    const lessPracticedArea = lessPracticedAreas[Math.floor(Math.random() * lessPracticedAreas.length)];
                    this.logger.debug('Selected less practiced focus area', { userId, focusArea: lessPracticedArea });
                    return lessPracticedArea;
                }
            }
        }
        
        // Priority 5: Use focus area from user's preferences
        if (preferences && preferences.focusArea) {
            this.logger.debug('Using focus area from user preferences', { userId, focusArea: preferences.focusArea });
            return preferences.focusArea;
        }
        
        // Priority 6: Use progress-tracked focus area
        if (progressFocusArea) {
            this.logger.debug('Using existing focus area from user progress', { userId, focusArea: progressFocusArea });
            return progressFocusArea;
        }
        
        // Priority 7: Use personality-derived focus area
        if (personalityFocusArea) {
            this.logger.debug('Using focus area from personality profile', { userId, focusArea: personalityFocusArea });
            return personalityFocusArea;
        }
        
        // Fallback to default focus area
        this.logger.debug('Using default focus area', { userId, focusArea: 'general' });
        return 'general';
    }
    
    /**
     * Determine challenge type using a decision tree approach
     * @param {string} userId - User ID
     * @param {Object} params - Parameters for decision
     * @returns {Promise<Object>} Challenge type object with code and metadata
     * @private
     */
    async _determineChallengeType(userId, params) {
        const { 
            requestedType, 
            dominantTraits, 
            focusArea, 
            completedChallenges,
            preferences
        } = params;
        
        // Priority 1: Use requested type if provided 
        if (requestedType) {
            try {
                const type = await this.challengeConfigService.getChallengeType(requestedType);
                if (type) {
                    this.logger.debug('Using explicitly requested challenge type', { userId, type: requestedType });
                    return type;
                }
            } catch (error) {
                this.logger.warn('Requested challenge type not found, will determine dynamically', { 
                    userId, requestedType, error: error.message 
                });
                // Continue to other methods if requested type not found
            }
        }
        
        // Priority 2: Balance approach - don't repeat same type multiple times
        if (completedChallenges && completedChallenges.length > 0) {
            // Get last 3 completed challenge types
            const recentTypes = completedChallenges
                .slice(-3)
                .map(c => c.challengeType)
                .filter(Boolean);
                
            if (recentTypes.length > 0) {
                try {
                    // Get all challenge types
                    const allTypes = await this.challengeConfigService.getAllChallengeTypes();
                    
                    // Filter out recently used types
                    const unusedTypes = allTypes.filter(type => !recentTypes.includes(type.code));
                    
                    if (unusedTypes.length > 0) {
                        // Try to match an unused type with the dominantTraits or focusArea
                        let matchedType = null;
                        
                        // Have the personalization service help with the selection
                        try {
                            matchedType = await this.challengePersonalizationService.selectChallengeType(
                                dominantTraits, 
                                [focusArea],
                                unusedTypes.map(t => t.code) // Limit selection to unused types
                            );
                        } catch (error) {
                            this.logger.warn('Error in personalization service during type selection', { 
                                userId, error: error.message 
                            });
                        }
                        
                        if (matchedType) {
                            this.logger.debug('Selected unused challenge type matching traits/focus', { 
                                userId, type: matchedType.code, focusArea 
                            });
                            return matchedType;
                        }
                        
                        // If no match, pick a random unused type 
                        const randomType = unusedTypes[Math.floor(Math.random() * unusedTypes.length)];
                        this.logger.debug('Selected random unused challenge type for variety', { 
                            userId, type: randomType.code 
                        });
                        return randomType;
                    }
                } catch (error) {
                    this.logger.warn('Error determining challenge type from history', { 
                        userId, error: error.message 
                    });
                    // Continue to other methods
                }
            }
        }
        
        // Priority 3: Use challenge type from preferences if available
        if (preferences && preferences.preferredChallengeType) {
            try {
                const type = await this.challengeConfigService.getChallengeType(preferences.preferredChallengeType);
                if (type) {
                    this.logger.debug('Using challenge type from user preferences', { 
                        userId, type: preferences.preferredChallengeType 
                    });
                    return type;
                }
            } catch (error) {
                this.logger.warn('Preferred challenge type not found', { 
                    userId, preferredType: preferences.preferredChallengeType, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 4: Use personalization service to match traits and focus area
        try {
            const type = await this.challengePersonalizationService.selectChallengeType(dominantTraits, [focusArea]);
            if (type) {
                this.logger.debug('Selected challenge type using personalization service', { 
                    userId, type: type.code, traits: dominantTraits, focusArea 
                });
                return type;
            }
        } catch (error) {
            this.logger.warn('Error selecting challenge type via personalization', { 
                userId, error: error.message 
            });
            // Continue to fallback
        }
        
        // Fallback to a default challenge type
        try {
            // Try to get "implementation" type as a sensible default 
            const defaultType = await this.challengeConfigService.getChallengeType('implementation');
            if (defaultType) {
                this.logger.debug('Using default implementation challenge type', { userId });
                return defaultType;
            }
        } catch (error) {
            this.logger.warn('Default challenge type not found', { userId, error: error.message });
        }
        
        // Ultimate fallback - return a bare minimum object
        this.logger.warn('Falling back to hardcoded challenge type', { userId });
        return { code: 'implementation', name: 'Implementation' };
    }
    
    /**
     * Determine difficulty level for a challenge
     * @param {string} userId - User ID
     * @param {Object} params - Parameters for decision
     * @returns {Promise<Difficulty|string>} Difficulty object or level code
     * @private
     */
    async _determineDifficulty(userId, params) {
        const { 
            requestedDifficulty, 
            userDifficulty, 
            recentScore, 
            skillLevel,
            completedCount,
            personalityTraits
        } = params;
        
        // Priority 1: Use requested difficulty if provided
        if (requestedDifficulty) {
            try {
                // Check if it's a valid difficulty level
                const difficultyLevel = await this.challengeConfigService.getDifficultyLevel(requestedDifficulty);
                if (difficultyLevel) {
                    this.logger.debug('Using explicitly requested difficulty level', { 
                        userId, difficulty: requestedDifficulty 
                    });
                    
                    // Create and return Difficulty model instance 
                    return new Difficulty({ level: difficultyLevel.code });
                }
            } catch (error) {
                this.logger.warn('Requested difficulty level not found, will determine dynamically', { 
                    userId, requestedDifficulty, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 2: Use persisted user difficulty level
        if (userDifficulty) {
            try {
                // Get the full difficulty level object
                const difficultyLevel = await this.challengeConfigService.getDifficultyLevel(userDifficulty);
                if (difficultyLevel) {
                    this.logger.debug('Using persisted user difficulty level', { 
                        userId, difficulty: userDifficulty 
                    });
                    
                    // Create Difficulty instance with the level
                    const difficulty = new Difficulty({ level: difficultyLevel.code });
                    
                    // Apply personality modifiers if traits are available
                    if (personalityTraits && personalityTraits.length > 0) {
                        // Convert traits array to object with trait values
                        const personalityObject = personalityTraits.reduce((obj, trait) => {
                            obj[trait.toLowerCase()] = 75; // Arbitrary value above threshold
                            return obj;
                        }, {});
                        
                        difficulty.applyPersonalityModifiers(personalityObject);
                    }
                    
                    return difficulty;
                }
            } catch (error) {
                this.logger.warn('Error loading persisted difficulty level', { 
                    userId, userDifficulty, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 3: Calculate from recent scores
        if (recentScore !== undefined && recentScore !== null) {
            try {
                // Use personalization service to determine difficulty from score
                const difficultyCode = this.challengePersonalizationService.determineDifficulty(
                    recentScore, 
                    completedCount || 0
                );
                
                // Get the full difficulty level object if possible
                try {
                    const difficultyLevel = await this.challengeConfigService.getDifficultyLevel(difficultyCode);
                    if (difficultyLevel) {
                        this.logger.debug('Determined difficulty level from recent scores', { 
                            userId, score: recentScore, difficulty: difficultyCode 
                        });
                        
                        // Create and initialize Difficulty instance
                        const difficulty = new Difficulty({ level: difficultyLevel.code });
                        difficulty.adjustBasedOnScore(recentScore);
                        return difficulty;
                    }
                } catch (error) {
                    // If difficultyLevel lookup fails, still use the code
                    this.logger.debug('Using difficulty code from scores (level details unavailable)', { 
                        userId, difficulty: difficultyCode 
                    });
                    return difficultyCode;
                }
            } catch (error) {
                this.logger.warn('Error calculating difficulty from scores', { 
                    userId, recentScore, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 4: Based on skill level for the specific focus area
        if (skillLevel !== undefined && skillLevel !== null) {
            try {
                // Create a Difficulty instance and set from absolute score
                const difficulty = new Difficulty();
                difficulty.setFromAbsoluteScore(skillLevel);
                
                this.logger.debug('Determined difficulty from skill level', { 
                    userId, skillLevel, level: difficulty.getCode() 
                });
                return difficulty;
            } catch (error) {
                this.logger.warn('Error calculating difficulty from skill level', { 
                    userId, skillLevel, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 5: Based on completion count - new users start easier
        if (completedCount !== undefined && completedCount !== null) {
            let levelCode;
            if (completedCount < 3) {
                levelCode = 'beginner';
            } else if (completedCount < 10) {
                levelCode = 'intermediate';
            } else if (completedCount < 25) {
                levelCode = 'advanced'; 
            } else {
                levelCode = 'expert';
            }
            
            this.logger.debug('Determined difficulty from completion count', { 
                userId, completedCount, level: levelCode 
            });
            return new Difficulty({ level: levelCode });
        }
        
        // Fallback: Use intermediate as a safe default
        this.logger.debug('Using default intermediate difficulty', { userId });
        return new Difficulty({ level: 'intermediate' });
    }
    
    /**
     * Determine format type for a challenge
     * @param {string} userId - User ID
     * @param {Object} params - Parameters for decision
     * @returns {Promise<Object|string>} Format type object or code
     * @private
     */
    async _determineFormatType(userId, params) {
        const { 
            requestedFormat, 
            challengeTypeCode, 
            preferences,
            completedChallenges,
            dominantTraits
        } = params;
        
        // Priority 1: Use requested format if provided
        if (requestedFormat) {
            try {
                // Check if it's a valid format type
                const formatType = await this.challengeConfigService.getFormatType(requestedFormat);
                if (formatType) {
                    this.logger.debug('Using explicitly requested format type', { 
                        userId, format: requestedFormat 
                    });
                    return formatType;
                }
            } catch (error) {
                this.logger.warn('Requested format type not found, will determine dynamically', { 
                    userId, requestedFormat, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 2: Use format from preferences if available
        if (preferences && preferences.preferredFormat) {
            try {
                const formatType = await this.challengeConfigService.getFormatType(preferences.preferredFormat);
                if (formatType) {
                    this.logger.debug('Using format type from user preferences', { 
                        userId, format: preferences.preferredFormat 
                    });
                    return formatType;
                }
            } catch (error) {
                this.logger.warn('Preferred format type not found', { 
                    userId, preferredFormat: preferences.preferredFormat, error: error.message 
                });
                // Continue to other methods
            }
        }
        
        // Priority 3: Get default format for the chosen challenge type
        try {
            const challengeType = await this.challengeConfigService.getChallengeType(challengeTypeCode);
            if (challengeType && challengeType.defaultFormatTypeCode) {
                try {
                    const formatType = await this.challengeConfigService.getFormatType(challengeType.defaultFormatTypeCode);
                    if (formatType) {
                        this.logger.debug('Using default format for challenge type', { 
                            userId, format: formatType.code, challengeType: challengeTypeCode 
                        });
                        return formatType;
                    }
                } catch (error) {
                    this.logger.warn('Default format type for challenge not found', { 
                        userId, defaultFormat: challengeType.defaultFormatTypeCode, error: error.message 
                    });
                    // Continue to other methods
                }
            }
        } catch (error) {
            this.logger.warn('Error getting default format from challenge type', { 
                userId, challengeType: challengeTypeCode, error: error.message 
            });
            // Continue to other methods
        }
        
        // Priority 4: Choose format that wasn't used recently
        if (completedChallenges && completedChallenges.length > 0) {
            // Get last 3 completed challenge formats
            const recentFormats = completedChallenges
                .slice(-3)
                .map(c => c.formatType)
                .filter(Boolean);
                
            if (recentFormats.length > 0) {
                try {
                    // Get all format types
                    const allFormats = await this.challengeConfigService.getAllFormatTypes();
                    
                    // Filter out recently used formats
                    const unusedFormats = allFormats.filter(f => !recentFormats.includes(f.code));
                    
                    if (unusedFormats.length > 0) {
                        // Pick a random unused format for variety
                        const randomFormat = unusedFormats[Math.floor(Math.random() * unusedFormats.length)];
                        this.logger.debug('Selected unused format type for variety', { 
                            userId, format: randomFormat.code 
                        });
                        return randomFormat;
                    }
                } catch (error) {
                    this.logger.warn('Error determining format from history', { 
                        userId, error: error.message 
                    });
                    // Continue to other methods
                }
            }
        }
        
        // Priority 5: Choose format based on traits
        if (dominantTraits && dominantTraits.length > 0) {
            try {
                // Get all format types
                const allFormats = await this.challengeConfigService.getAllFormatTypes();
                
                // Simple trait to format type matching
                if (dominantTraits.includes('Analytical')) {
                    // Analytical: Prefer code-based formats
                    const codeFormat = allFormats.find(f => 
                        f.code === 'code' || f.code === 'debug' || f.code === 'refactor'
                    );
                    if (codeFormat) {
                        this.logger.debug('Selected format based on Analytical trait', { 
                            userId, format: codeFormat.code 
                        });
                        return codeFormat;
                    }
                } else if (dominantTraits.includes('Creative')) {
                    // Creative: Prefer design or open-ended formats
                    const designFormat = allFormats.find(f => 
                        f.code === 'design' || f.code === 'essay' || f.code === 'openended'
                    );
                    if (designFormat) {
                        this.logger.debug('Selected format based on Creative trait', { 
                            userId, format: designFormat.code 
                        });
                        return designFormat;
                    }
                } else if (dominantTraits.includes('Practical')) {
                    // Practical: Prefer implementation or examples
                    const practicalFormat = allFormats.find(f => 
                        f.code === 'implementation' || f.code === 'example' || f.code === 'fix'
                    );
                    if (practicalFormat) {
                        this.logger.debug('Selected format based on Practical trait', { 
                            userId, format: practicalFormat.code 
                        });
                        return practicalFormat;
                    }
                }
            } catch (error) {
                this.logger.warn('Error selecting format based on traits', { 
                    userId, traits: dominantTraits, error: error.message 
                });
                // Continue to fallback
            }
        }
        
        // Fallback: Get first available format type
        try {
            const allFormats = await this.challengeConfigService.getAllFormatTypes();
            if (allFormats && allFormats.length > 0) {
                this.logger.debug('Using first available format type as fallback', { 
                    userId, format: allFormats[0].code 
                });
                return allFormats[0];
            }
        } catch (error) {
            this.logger.warn('Error getting available format types', { 
                userId, error: error.message 
            });
        }
        
        // Ultimate fallback: Return a code string for a sensible default
        this.logger.warn('Falling back to hardcoded format type', { userId });
        return 'code';
    }
    
    /**
     * Calculate the average score from recent challenges
     * @param {Array} completedChallenges - Array of completed challenges
     * @param {number} [count=3] - Number of recent challenges to consider
     * @returns {number|null} Average score or null if no scores
     * @private
     */
    _calculateRecentAverageScore(completedChallenges, count = 3) {
        if (!Array.isArray(completedChallenges) || completedChallenges.length === 0) {
            return null;
        }
        
        // Sort by most recent first (if timestamp available)
        const sorted = [...completedChallenges].sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt) : 0;
            const dateB = b.completedAt ? new Date(b.completedAt) : 0;
            return dateB - dateA;
        });
        
        // Take the most recent 'count' challenges with scores
        const recentWithScores = sorted
            .filter(c => c.score !== null && c.score !== undefined)
            .slice(0, count);
            
        if (recentWithScores.length === 0) {
            return null;
        }
        
        // Calculate average
        const sum = recentWithScores.reduce((acc, challenge) => acc + challenge.score, 0);
        return sum / recentWithScores.length;
    }
    
    /**
     * Extract information from recent challenges for context
     * @param {Array} completedChallenges - Array of completed challenges
     * @param {number} [count=3] - Number of recent challenges to include
     * @returns {Array} Array of simplified challenge info objects
     * @private
     */
    _extractRecentChallengeInfo(completedChallenges, count = 3) {
        if (!Array.isArray(completedChallenges) || completedChallenges.length === 0) {
            return [];
        }
        
        // Sort by most recent first
        const sorted = [...completedChallenges].sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt) : 0;
            const dateB = b.completedAt ? new Date(b.completedAt) : 0;
            return dateB - dateA;
        });
        
        // Take the most recent 'count' challenges
        return sorted.slice(0, count).map(challenge => ({
            type: challenge.challengeType,
            focusArea: challenge.focusArea,
            score: challenge.score,
            success: challenge.score >= 70, // Define success as score >= 70%
            format: challenge.formatType
        }));
    }
    
    /**
     * Format skill levels for use in challenge generation context
     * @param {Object} skillLevels - Skill levels object
     * @returns {Array} Array of skill objects with name and level
     * @private
     */
    _formatSkillLevelsForContext(skillLevels) {
        if (!skillLevels || typeof skillLevels !== 'object') {
            return [];
        }
        
        return Object.entries(skillLevels)
            .filter(([_, value]) => typeof value === 'number')
            .map(([key, value]) => ({
                name: this._formatSkillName(key),
                level: value
            }))
            .sort((a, b) => b.level - a.level); // Sort by level descending
    }
    
    /**
     * Determine experience level based on challenge count and skill levels
     * @param {number} challengeCount - Number of completed challenges
     * @param {Array} skillLevels - Array of skill level values
     * @returns {string} Experience level (beginner, intermediate, advanced, expert)
     * @private
     */
    _determineExperienceLevel(challengeCount, skillLevels) {
        // Calculate average skill level
        const avgSkillLevel = skillLevels.length > 0
            ? skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length
            : 0;
            
        // Combine challenge count and average skill level (weighted)
        const combinedScore = (challengeCount * 0.4) + (avgSkillLevel * 0.6);
        
        // Map to experience level
        if (combinedScore > 80) return 'expert';
        if (combinedScore > 50) return 'advanced';
        if (combinedScore > 20) return 'intermediate';
        return 'beginner';
    }
    
    /**
     * Calculate base time allocation from difficulty level
     * @param {string} difficultyLevel - Difficulty level code
     * @returns {number} Time allocation in seconds
     * @private
     */
    _calculateBaseTimeAllocation(difficultyLevel) {
        // Base times for each difficulty level (in seconds)
        const baseTimes = {
            'beginner': 1200, // 20 minutes
            'intermediate': 1800, // 30 minutes
            'advanced': 2700, // 45 minutes
            'expert': 3600 // 60 minutes
        };
        
        return baseTimes[difficultyLevel] || 1800; // Default to intermediate
    }
    
    /**
     * Map difficulty level to complexity value for challenge params
     * @param {string} difficultyLevel - Difficulty level code
     * @returns {number} Complexity value (0-1)
     * @private
     */
    _mapDifficultyToComplexity(difficultyLevel) {
        const complexityMap = {
            'beginner': 0.3,
            'intermediate': 0.5,
            'advanced': 0.7,
            'expert': 0.9
        };
        
        return complexityMap[difficultyLevel] || 0.5;
    }
    
    /**
     * Map difficulty level to depth value for challenge params
     * @param {string} difficultyLevel - Difficulty level code
     * @returns {number} Depth value (0-1)
     * @private
     */
    _mapDifficultyToDepth(difficultyLevel) {
        const depthMap = {
            'beginner': 0.25,
            'intermediate': 0.5,
            'advanced': 0.75,
            'expert': 0.9
        };
        
        return depthMap[difficultyLevel] || 0.5;
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
