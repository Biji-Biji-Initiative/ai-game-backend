import { withServiceErrorHandling } from "../../infra/errors/errorStandardization.js";
'use strict';
// Difficulty level threshold constants
const DIFFICULTY_THRESHOLDS = {
    BEGINNER_SCORE: 50,
    INTERMEDIATE_SCORE: 70,
    NEW_USER_THRESHOLD: 3
};
// Time allocation constants (in seconds)
const TIME_ALLOCATIONS = {
    BEGINNER: 300, // 5 minutes
    STRUGGLING: 360, // 6 minutes
    INTERMEDIATE: 480, // 8 minutes
    ADVANCED: 600, // 10 minutes
    REFLECTION_BONUS: 120 // Additional 2 minutes for reflection challenges
};
// Challenge types that need more reflection time
const REFLECTION_TYPES = ['critical-thinking', 'ethical-dilemma', 'human-ai-boundary'];
/**
 * Service responsible for personalizing challenges based on user attributes
 */
class ChallengePersonalizationService {
    /**
     * Create a new ChallengePersonalizationService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.challengeTypeRepository - Repository for challenge types
     * @param {Object} dependencies.focusAreaConfigRepository - Repository for focus area mappings
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { challengeTypeRepository, focusAreaConfigRepository, logger } = dependencies;
        if (!challengeTypeRepository) {
            throw new Error('challengeTypeRepository is required for ChallengePersonalizationService');
        }
        if (!logger) {
            throw new Error('logger is required for ChallengePersonalizationService');
        }
        this.challengeTypeRepository = challengeTypeRepository;
        this.focusAreaConfigRepository = focusAreaConfigRepository;
        this.logger = logger;
        // Apply standardized error handling to methods
        this.selectChallengeType = withServiceErrorHandling(this.selectChallengeType.bind(this), {
            methodName: 'selectChallengeType',
            domainName: 'challenge',
            logger: this.logger
        });
        this.determineDifficulty = withServiceErrorHandling(this.determineDifficulty.bind(this), {
            methodName: 'determineDifficulty',
            domainName: 'challenge',
            logger: this.logger
        });
    }
    /**
     * Select appropriate challenge type based on user traits and preferences
     * @param {Array} dominantTraits - User's dominant trait IDs
     * @param {Array} focusAreas - User's chosen focus areas
     * @returns {Promise<Object>} Challenge type information
     */
    async selectChallengeType(dominantTraits, focusAreas) {
        // Validate inputs
        if (!dominantTraits || !Array.isArray(dominantTraits)) {
            throw new Error('Dominant traits must be provided as an array');
        }
        if (!focusAreas || !Array.isArray(focusAreas)) {
            throw new Error('Focus areas must be provided as an array');
        }
        this.logger.debug('Selecting challenge type', { dominantTraits, focusAreas });
        // Get all challenge types from the repository
        const challengeTypes = await this.challengeTypeRepository.getChallengeTypes();
        if (!challengeTypes || challengeTypes.length === 0) {
            throw new Error('No challenge types found in the repository');
        }
        // Get trait and focus area mappings from repository
        const traitMappings = await this.challengeTypeRepository.getTraitMappings();
        const focusAreaMappings = await this.challengeTypeRepository.getFocusAreaMappings();
        if (!traitMappings) {
            throw new Error('Failed to retrieve trait mappings from repository');
        }
        if (!focusAreaMappings) {
            throw new Error('Failed to retrieve focus area mappings from repository');
        }
        // Get all valid challenge type codes
        const allChallengeTypeCodes = challengeTypes.map(type => type.code);
        // Try to match based on dominant traits
        let selectedTypeCode = null;
        for (const trait of dominantTraits) {
            const mappedType = traitMappings[trait];
            if (mappedType && allChallengeTypeCodes.includes(mappedType)) {
                selectedTypeCode = mappedType;
                break;
            }
        }
        // If no match based on traits, try to match based on focus areas
        if (!selectedTypeCode) {
            for (const focusArea of focusAreas) {
                const mappedType = focusAreaMappings[focusArea];
                if (mappedType && allChallengeTypeCodes.includes(mappedType)) {
                    selectedTypeCode = mappedType;
                    break;
                }
            }
        }
        // If still no match, use default critical-thinking if available
        if (!selectedTypeCode && allChallengeTypeCodes.includes('critical-thinking')) {
            selectedTypeCode = 'critical-thinking';
        }
        else if (!selectedTypeCode && allChallengeTypeCodes.length > 0) {
            // Use the first available type
            selectedTypeCode = allChallengeTypeCodes[0];
        }
        if (!selectedTypeCode) {
            throw new Error('Failed to select a valid challenge type');
        }
        // Find the selected type from the repository
        const selectedType = challengeTypes.find(type => type.code === selectedTypeCode);
        if (!selectedType) {
            throw new Error(`Challenge type with code ${selectedTypeCode} not found`);
        }
        this.logger.debug('Selected challenge type', {
            typeCode: selectedTypeCode,
            typeName: selectedType.name
        });
        return {
            code: selectedTypeCode,
            id: selectedType.id,
            name: selectedType.name,
            metadata: {
                description: selectedType.description
            }
        };
    }
    /**
     * Determine challenge difficulty based on user performance
     * @param {Object} userPerformance - User's performance metrics
     * @param {string} challengeType - Type of challenge
     * @returns {Object} Difficulty parameters including level, complexity, depth, and time allocation
     */
    determineDifficulty(userPerformance, challengeType) {
        // Validate inputs
        if (!userPerformance) {
            throw new Error('User performance object is required');
        }
        if (!challengeType) {
            throw new Error('Challenge type is required for difficulty determination');
        }
        const { averageScore = 0, completedChallenges = 0 } = userPerformance;
        this.logger.debug('Determining difficulty', {
            averageScore,
            completedChallenges,
            challengeType
        });
        // Base difficulty on average score and number of completed challenges
        let level, complexity, depth, timeAllocation;
        if (completedChallenges < DIFFICULTY_THRESHOLDS.NEW_USER_THRESHOLD) {
            // New users start with beginner challenges
            level = 'beginner';
            complexity = 0.3;
            depth = 0.3;
            timeAllocation = TIME_ALLOCATIONS.BEGINNER;
        }
        else if (averageScore < DIFFICULTY_THRESHOLDS.BEGINNER_SCORE) {
            // Struggling users get easier challenges
            level = 'beginner';
            complexity = 0.4;
            depth = 0.4;
            timeAllocation = TIME_ALLOCATIONS.STRUGGLING;
        }
        else if (averageScore < DIFFICULTY_THRESHOLDS.INTERMEDIATE_SCORE) {
            // Average users get moderate challenges
            level = 'intermediate';
            complexity = 0.6;
            depth = 0.6;
            timeAllocation = TIME_ALLOCATIONS.INTERMEDIATE;
        }
        else {
            // High-performing users get difficult challenges
            level = 'advanced';
            complexity = 0.8;
            depth = 0.8;
            timeAllocation = TIME_ALLOCATIONS.ADVANCED;
        }
        // Reflection-based challenge types need more time
        if (REFLECTION_TYPES.includes(challengeType)) {
            // These types need more time for reflection
            timeAllocation += TIME_ALLOCATIONS.REFLECTION_BONUS;
        }
        return {
            level,
            complexity,
            depth,
            timeAllocation
        };
    }
}
export default ChallengePersonalizationService;
