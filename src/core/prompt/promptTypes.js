'use strict';
/**
 * Prompt Types
 *
 * Defines all standard prompt types used in the application and their associations
 * with recommended models and output formats.
 *
 * @module promptTypes
 */
/**
 * Enum of standard prompt types
 * @enum {string}
 */
const PROMPT_TYPES = {
    // Core types
    EVALUATION: 'evaluation',
    CHALLENGE: 'challenge',
    FOCUS_AREA: 'focus-area',
    PERSONALITY: 'personality',
    PROGRESS: 'progress',
    // Extended types
    SCORE_CALIBRATION: 'score-calibration',
    FEEDBACK_ENHANCEMENT: 'feedback-enhancement',
    CHALLENGE_VARIATION: 'challenge-variation',
    HINT_GENERATION: 'hint-generation',
    SOLUTION_GENERATION: 'solution-generation',
    FOCUS_AREA_RECOMMENDATIONS: 'focus-area-recommendations',
    SKILL_MAPPING: 'skill-mapping',
    LEARNING_STYLE: 'learning-style',
    SKILL_ASSESSMENT: 'skill-assessment',
    GROWTH_TRAJECTORY: 'growth-trajectory',
    // Adaptive types
    ADAPTIVE_CHALLENGE_SELECTION: 'adaptive-challenge-selection',
    DIFFICULTY_CALIBRATION: 'difficulty-calibration',
    PERSONALIZED_LEARNING_PATH: 'personalized-learning-path',
    ENGAGEMENT_OPTIMIZATION: 'engagement-optimization',
};
/**
 * Map of prompt types to their recommended models
 * @type {Object<string, string>}
 */
const RECOMMENDED_MODELS = {
    [PROMPT_TYPES.EVALUATION]: 'gpt-4o',
    [PROMPT_TYPES.CHALLENGE]: 'gpt-4o',
    [PROMPT_TYPES.FOCUS_AREA]: 'gpt-4o',
    [PROMPT_TYPES.PERSONALITY]: 'gpt-4o',
    [PROMPT_TYPES.PROGRESS]: 'gpt-4o',
    [PROMPT_TYPES.SCORE_CALIBRATION]: 'gpt-4o',
    [PROMPT_TYPES.FEEDBACK_ENHANCEMENT]: 'gpt-4o',
    [PROMPT_TYPES.CHALLENGE_VARIATION]: 'gpt-4o',
    [PROMPT_TYPES.HINT_GENERATION]: 'gpt-3.5-turbo',
    [PROMPT_TYPES.SOLUTION_GENERATION]: 'gpt-4o',
    [PROMPT_TYPES.FOCUS_AREA_RECOMMENDATIONS]: 'gpt-4o',
    [PROMPT_TYPES.SKILL_MAPPING]: 'gpt-4o',
    [PROMPT_TYPES.LEARNING_STYLE]: 'gpt-4o',
    [PROMPT_TYPES.SKILL_ASSESSMENT]: 'gpt-4o',
    [PROMPT_TYPES.GROWTH_TRAJECTORY]: 'gpt-4o',
    [PROMPT_TYPES.ADAPTIVE_CHALLENGE_SELECTION]: 'gpt-4o',
    [PROMPT_TYPES.DIFFICULTY_CALIBRATION]: 'gpt-4o',
    [PROMPT_TYPES.PERSONALIZED_LEARNING_PATH]: 'gpt-4o',
    [PROMPT_TYPES.ENGAGEMENT_OPTIMIZATION]: 'gpt-4o',
};
/**
 * Map of prompt types to their default output formats
 * @type {Object<string, Object>}
 */
const OUTPUT_FORMATS = {
    [PROMPT_TYPES.EVALUATION]: { format: 'json', schema: 'evaluationSchema' },
    [PROMPT_TYPES.CHALLENGE]: { format: 'json', schema: 'challengeSchema' },
    [PROMPT_TYPES.FOCUS_AREA]: { format: 'json', schema: 'focusAreaSchema' },
    [PROMPT_TYPES.PERSONALITY]: { format: 'json', schema: 'personalitySchema' },
    [PROMPT_TYPES.PROGRESS]: { format: 'json', schema: 'progressSchema' },
    [PROMPT_TYPES.SCORE_CALIBRATION]: { format: 'json', schema: 'calibrationSchema' },
    [PROMPT_TYPES.FEEDBACK_ENHANCEMENT]: { format: 'markdown' },
    [PROMPT_TYPES.CHALLENGE_VARIATION]: { format: 'json', schema: 'challengeSchema' },
    [PROMPT_TYPES.HINT_GENERATION]: { format: 'markdown' },
    [PROMPT_TYPES.SOLUTION_GENERATION]: { format: 'markdown' },
    [PROMPT_TYPES.FOCUS_AREA_RECOMMENDATIONS]: { format: 'json', schema: 'recommendationsSchema' },
    [PROMPT_TYPES.SKILL_MAPPING]: { format: 'json', schema: 'skillMappingSchema' },
    [PROMPT_TYPES.LEARNING_STYLE]: { format: 'json', schema: 'learningStyleSchema' },
    [PROMPT_TYPES.SKILL_ASSESSMENT]: { format: 'json', schema: 'skillAssessmentSchema' },
    [PROMPT_TYPES.GROWTH_TRAJECTORY]: { format: 'json', schema: 'growthTrajectorySchema' },
    [PROMPT_TYPES.ADAPTIVE_CHALLENGE_SELECTION]: {
        format: 'json',
        schema: 'adaptiveChallengeSelectionSchema',
    },
    [PROMPT_TYPES.DIFFICULTY_CALIBRATION]: { format: 'json', schema: 'difficultyCalibratonSchema' },
    [PROMPT_TYPES.PERSONALIZED_LEARNING_PATH]: {
        format: 'json',
        schema: 'personalizedLearningPathSchema',
    },
    [PROMPT_TYPES.ENGAGEMENT_OPTIMIZATION]: {
        format: 'json',
        schema: 'engagementOptimizationSchema',
    },
};
/**
 * Get the recommended model for a prompt type
 * @param {string} type - The prompt type
 * @returns {string} The recommended model, or a default model if not specified
 */
function getRecommendedModel(type) {
    return RECOMMENDED_MODELS[type.toLowerCase()] || 'gpt-4o';
}
/**
 * Get the output format for a prompt type
 * @param {string} type - The prompt type
 * @returns {Object|null} The output format, or null if not specified
 */
function getOutputFormat(type) {
    return OUTPUT_FORMATS[type.toLowerCase()] || null;
}
export { PROMPT_TYPES };
export { getRecommendedModel };
export { getOutputFormat };
export default {
    PROMPT_TYPES,
    getRecommendedModel,
    getOutputFormat
};
