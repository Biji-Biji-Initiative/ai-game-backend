'use strict';
/**
 * Evaluation Configuration
 *
 * Contains configuration constants for evaluation-related functionality.
 * Extracts magic numbers from UserContextService to improve maintainability and readability.
 */

/**
 * Skill level score thresholds
 * Used for categorizing user skills based on scores
 */
export const SKILL_THRESHOLDS = {
    STRENGTH: 80,  // Scores at or above this value are considered strengths
    WEAKNESS: 60   // Scores at or below this value are considered weaknesses
};

/**
 * Collection limits for user context data
 */
export const COLLECTION_LIMITS = {
    CHALLENGES: 10,   // Number of challenges to retrieve for user context
    EVALUATIONS: 5,   // Number of evaluations to retrieve for user context
};

/**
 * Consistency thresholds
 * Determine when a pattern is considered consistent
 */
export const CONSISTENCY_THRESHOLD = {
    MINIMUM_OCCURRENCES: 2  // Pattern must occur at least this many times to be considered consistent
};

/**
 * Weight normalization target
 * The sum to which category weights should be normalized
 */
export const WEIGHT_NORMALIZATION = {
    TARGET_SUM: 100,  // Category weights should sum to this value
    WEAKNESS_ADJUSTMENT: 5  // Amount to increase weight for areas of weakness
};

/**
 * Default weights for different evaluation categories
 * Used as base values before personalization
 */
export const DEFAULT_CATEGORY_WEIGHTS = {
    STANDARD: {
        accuracy: 35,
        clarity: 25,
        reasoning: 25,
        creativity: 15
    },
    ANALYSIS: {
        accuracy: 30,
        critical_thinking: 30,
        clarity: 20,
        insight: 20
    },
    SCENARIO: {
        problem_solving: 35,
        application: 30,
        reasoning: 20,
        communication: 15
    },
    ETHICS: {
        ethical_reasoning: 40,
        comprehensiveness: 25,
        clarity: 20,
        practical_application: 15
    }
};

export default {
    SKILL_THRESHOLDS,
    COLLECTION_LIMITS,
    CONSISTENCY_THRESHOLD,
    WEIGHT_NORMALIZATION,
    DEFAULT_CATEGORY_WEIGHTS
}; 