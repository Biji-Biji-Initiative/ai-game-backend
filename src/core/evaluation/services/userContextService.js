import { 
  withServiceErrorHandling, 
  createErrorMapper
} from "../../infra/errors/errorStandardization.js";
import { 
  EvaluationError, 
  EvaluationNotFoundError, 
  EvaluationValidationError, 
  EvaluationProcessingError 
} from "../errors/EvaluationErrors.js";
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
 * Specialized service for gathering, integrating and managing user context
 * for deeply personalized evaluations.
 */
class UserContextService {
    /**
     * Create a new UserContextService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.userRepository - Repository for user data
     * @param {Object} dependencies.challengeRepository - Repository for challenges
     * @param {Object} dependencies.evaluationRepository - Repository for evaluations
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { userRepository, challengeRepository, evaluationRepository, logger } = dependencies;
        if (!logger) {
            throw new Error('Logger is required for UserContextService');
        }
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.evaluationRepository = evaluationRepository;
        this.logger = logger;
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
        // Get user profile if repository available
        if (this.userRepository) {
            try {
                const userProfile = await this.userRepository.getUserById(userId);
                if (userProfile) {
                    context.profile = {
                        name: userProfile.name || userProfile.displayName,
                        email: userProfile.email,
                        skillLevel: userProfile.skillLevel || 'intermediate',
                        profession: userProfile.profession || userProfile.title,
                        focusAreas: userProfile.focusAreas || [],
                        learningGoals: userProfile.learningGoals || [],
                        preferredLearningStyle: userProfile.preferredLearningStyle,
                    };
                    // Add focus areas to learning journey
                    context.learningJourney.focusAreas = userProfile.focusAreas || [];
                }
            }
            catch (profileError) {
                this.logger.warn('Error fetching user profile for context', {
                    userId,
                    error: profileError.message,
                });
            }
        }
        // Get challenge history if repository available
        if (this.challengeRepository) {
            try {
                const userChallenges = await this.challengeRepository.getChallengesByUserId(userId, {
                    limit: 10,
                    sort: 'completedAt:desc',
                });
                if (userChallenges && userChallenges.length > 0) {
                    context.learningJourney.completedChallenges = userChallenges.length;
                    // Process challenge history
                    context.learningJourney.challengeHistory = userChallenges.map(challenge => ({
                        id: challenge.id,
                        title: challenge.title,
                        type: challenge.challengeType || challenge.type,
                        focusArea: challenge.focusArea,
                        completedAt: challenge.completedAt || challenge.updatedAt,
                        difficulty: challenge.difficulty || 'intermediate',
                    }));
                    // Extract focus area distribution
                    const focusAreaCounts = {};
                    userChallenges.forEach(challenge => {
                        if (challenge.focusArea) {
                            focusAreaCounts[challenge.focusArea] =
                                (focusAreaCounts[challenge.focusArea] || 0) + 1;
                        }
                    });
                    // Sort by count
                    const topFocusAreas = Object.entries(focusAreaCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([area]) => area);
                    // Merge with explicit focus areas
                    if (topFocusAreas.length > 0) {
                        const existingFocusAreas = new Set(context.learningJourney.focusAreas);
                        topFocusAreas.forEach(area => {
                            if (!existingFocusAreas.has(area)) {
                                context.learningJourney.focusAreas.push(area);
                            }
                        });
                    }
                }
            }
            catch (challengeError) {
                this.logger.warn('Error fetching challenge history for context', {
                    userId,
                    error: challengeError.message,
                });
            }
        }
        // Get evaluation history if repository available
        if (this.evaluationRepository) {
            try {
                const recentEvaluations = await this.evaluationRepository.getEvaluationsByUserId(userId, {
                    limit: 5,
                    sort: 'createdAt:desc',
                });
                if (recentEvaluations && recentEvaluations.length > 0) {
                    // Process evaluation metrics
                    let totalScore = 0;
                    const categoryCounts = {};
                    const categoryScores = {};
                    const strengths = new Map();
                    const weaknesses = new Map();
                    recentEvaluations.forEach(evaluation => {
                        // Track overall scores
                        totalScore += evaluation.score || 0;
                        // Track category scores
                        if (evaluation.categoryScores) {
                            Object.entries(evaluation.categoryScores).forEach(([category, score]) => {
                                if (!categoryScores[category]) {
                                    categoryScores[category] = [];
                                }
                                categoryScores[category].push(score);
                                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                                // Identify strengths (high scores)
                                if (score >= 80) {
                                    if (!strengths.has(category)) {
                                        strengths.set(category, 0);
                                    }
                                    strengths.set(category, strengths.get(category) + 1);
                                }
                                // Identify weaknesses (low scores)
                                if (score <= 60) {
                                    if (!weaknesses.has(category)) {
                                        weaknesses.set(category, 0);
                                    }
                                    weaknesses.set(category, weaknesses.get(category) + 1);
                                }
                            });
                        }
                        // Add to evaluation history
                        context.learningJourney.evaluationHistory.push({
                            evaluationId: evaluation.id,
                            challengeId: evaluation.challengeId,
                            score: evaluation.score,
                            strengths: evaluation.strengths || [],
                            areasForImprovement: evaluation.areasForImprovement || [],
                            categoryScores: evaluation.categoryScores || {},
                            createdAt: evaluation.createdAt,
                        });
                    });
                    // Calculate average scores per category
                    const avgCategoryScores = {};
                    Object.entries(categoryScores).forEach(([category, scores]) => {
                        avgCategoryScores[category] = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
                    });
                    // Set skill levels based on category averages
                    context.learningJourney.skillLevels = avgCategoryScores;
                    // Find consistent strengths (appear in multiple evaluations)
                    const consistentStrengths = [...strengths.entries()]
                        .filter(([_, count]) => count >= 2)
                        .map(([category]) => category);
                    // Find persistent weaknesses (appear in multiple evaluations)
                    const persistentWeaknesses = [...weaknesses.entries()]
                        .filter(([_, count]) => count >= 2)
                        .map(([category]) => category);
                    context.strengths = consistentStrengths;
                    context.areasForGrowth = persistentWeaknesses;
                    // Calculate average score
                    if (recentEvaluations.length > 0) {
                        context.learningJourney.averageScore = Math.round(totalScore / recentEvaluations.length);
                    }
                }
            }
            catch (evaluationError) {
                this.logger.warn('Error fetching evaluation history for context', {
                    userId,
                    error: evaluationError.message,
                });
            }
        }
        // Add session context if provided
        if (options.sessionContext) {
            context.sessionContext = options.sessionContext;
        }
        this.logger.debug('User context gathered successfully', {
            userId,
            contextSize: JSON.stringify(context).length,
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
                criteria.categoryWeights[weakness] += 5;
            }
        });
        // Normalize weights to sum to 100
        const totalWeight = Object.values(criteria.categoryWeights).reduce((sum, w) => sum + w, 0);
        if (totalWeight > 0 && totalWeight !== 100) {
            const factor = 100 / totalWeight;
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
        // Standard weights
        const defaultWeights = {
            accuracy: 35,
            clarity: 25,
            reasoning: 25,
            creativity: 15,
        };
        // Customize based on challenge type
        switch (challengeType.toLowerCase()) {
            case 'analysis':
                return {
                    accuracy: 30,
                    critical_thinking: 30,
                    clarity: 20,
                    insight: 20,
                };
            case 'scenario':
                return {
                    problem_solving: 35,
                    application: 30,
                    reasoning: 20,
                    communication: 15,
                };
            // Add more types as needed
            default:
                // Use focus area for customization
                if (focusArea?.toLowerCase().includes('ethics')) {
                    return {
                        ethical_reasoning: 40,
                        comprehensiveness: 25,
                        clarity: 20,
                        practical_application: 15,
                    };
                }
                return defaultWeights;
        }
    }
}
export { UserContextService };
export default {
    UserContextService
};
