'use strict';
const LEVEL_THRESHOLDS = {
    EXPERT: 0.85, // Threshold for expert level
    ADVANCED: 0.65, // Threshold for advanced level
    INTERMEDIATE: 0.4, // Threshold for intermediate level
    // Below INTERMEDIATE threshold is considered beginner
};
const ADJUSTMENT = {
    // For increase() method
    INCREASE: {
        COMPLEXITY_FACTOR: 0.3, // Factor for increasing complexity
        DEPTH_FACTOR: 0.3, // Factor for increasing depth
        TIME_FACTOR: 0.15, // Factor for reducing time allocation
    },
    // For decrease() method
    DECREASE: {
        COMPLEXITY_FACTOR: 0.2, // Factor for decreasing complexity
        DEPTH_FACTOR: 0.2, // Factor for decreasing depth
        TIME_FACTOR: 0.2, // Factor for increasing time allocation
        MIN_COMPLEXITY: 0.2, // Minimum complexity value
        MIN_DEPTH: 0.2, // Minimum depth value
    },
    // For adjustBasedOnScore() method
    SCORE: {
        HIGH_THRESHOLD: 85, // Score threshold for increasing difficulty
        LOW_THRESHOLD: 60, // Score threshold for decreasing difficulty
        HIGH_MAX_ADJUST: 20, // Maximum percentage increase for perfect score
        LOW_MAX_ADJUST: 25, // Maximum percentage decrease for zero score
        ADAPTIVE_CENTER: 70, // Center point for adaptive factor calculation
        ADAPTIVE_RANGE: 30, // Range for normalizing adaptive factor
    },
};
const TRAIT_MODIFIERS = {
    THRESHOLD: 0.7, // Threshold for considering a trait significant
    OPENNESS_COMPLEXITY: 0.1, // How much to increase complexity for high openness
    CONSCIENTIOUSNESS_DEPTH: 0.1, // How much to increase depth for high conscientiousness
    NEUROTICISM_TIME: 1.2, // Factor to multiply time by for high neuroticism
};
const TIME_ALLOCATION = {
    DEFAULT: 300, // Default time allocation in seconds (5 minutes)
    MIN: 60, // Minimum time allocation in seconds (1 minute)
    MAX: 1800, // Maximum time allocation in seconds (30 minutes)
};
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export { LEVEL_THRESHOLDS };
export { ADJUSTMENT };
export { TRAIT_MODIFIERS };
export { TIME_ALLOCATION };
export { VALID_LEVELS };
export default {
    LEVEL_THRESHOLDS,
    ADJUSTMENT,
    TRAIT_MODIFIERS,
    TIME_ALLOCATION,
    VALID_LEVELS
};
