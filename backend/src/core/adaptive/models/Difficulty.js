import { LEVEL_THRESHOLDS, ADJUSTMENT, TRAIT_MODIFIERS, TIME_ALLOCATION, VALID_LEVELS } from "#app/core/adaptive/config/difficultyConfig.js";
import { AdaptiveValidationError } from "#app/core/adaptive/errors/adaptiveErrors.js";
'use strict';
/**
 *
 */
class Difficulty {
    /**
     * Create a difficulty instance
     * @param {Object} data - Difficulty data
     */
    /**
     * Method constructor
     */
    constructor(data = {}) {
        this.level = data.level || 'beginner';
        this.complexity = data.complexity !== undefined ? data.complexity : 0.5;
        this.depth = data.depth !== undefined ? data.depth : 0.5;
        this.timeAllocation = data.timeAllocation || TIME_ALLOCATION.DEFAULT;
        this.adaptiveFactor = data.adaptiveFactor !== undefined ? data.adaptiveFactor : 0.0;
    }
    /**
     * Validate the difficulty model
     * @returns {Object} Validation result with isValid and errors properties
     */
    /**
     * Method validate
     */
    validate() {
        const errors = [];
        // Validate level
        if (!VALID_LEVELS.includes(this.level)) {
            errors.push(`Level must be one of: ${VALID_LEVELS.join(', ')}`);
        }
        // Validate complexity and depth ranges
        if (this.complexity < 0 || this.complexity > 1) {
            errors.push('Complexity must be between 0 and 1');
        }
        if (this.depth < 0 || this.depth > 1) {
            errors.push('Depth must be between 0 and 1');
        }
        // Validate time allocation
        if (this.timeAllocation < TIME_ALLOCATION.MIN || this.timeAllocation > TIME_ALLOCATION.MAX) {
            errors.push(`Time allocation must be between ${TIME_ALLOCATION.MIN} and ${TIME_ALLOCATION.MAX} seconds`);
        }
        // Validate adaptive factor
        if (this.adaptiveFactor < -1 || this.adaptiveFactor > 1) {
            errors.push('Adaptive factor must be between -1 and 1');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Increase difficulty by a certain percentage
     * @param {number} percentage - Percentage to increase (0-100)
     */
    /**
     * Method increase
     */
    increase(percentage = 10) {
        if (percentage < 0 || percentage > 100) {
            throw new AdaptiveValidationError('Percentage must be between 0 and 100');
        }
        const factor = percentage / 100;
        // Increase complexity and depth
        this.complexity = Math.min(1, this.complexity + factor * ADJUSTMENT.INCREASE.COMPLEXITY_FACTOR);
        this.depth = Math.min(1, this.depth + factor * ADJUSTMENT.INCREASE.DEPTH_FACTOR);
        // Decrease time allocation (harder = less time)
        this.timeAllocation = Math.max(TIME_ALLOCATION.MIN, this.timeAllocation * (1 - factor * ADJUSTMENT.INCREASE.TIME_FACTOR));
        // Update level based on new complexity and depth
        this.updateLevel();
    }
    /**
     * Decrease difficulty by a certain percentage
     * @param {number} percentage - Percentage to decrease (0-100)
     */
    /**
     * Method decrease
     */
    decrease(percentage = 10) {
        if (percentage < 0 || percentage > 100) {
            throw new AdaptiveValidationError('Percentage must be between 0 and 100');
        }
        const factor = percentage / 100;
        // Decrease complexity and depth
        this.complexity = Math.max(ADJUSTMENT.DECREASE.MIN_COMPLEXITY, this.complexity - factor * ADJUSTMENT.DECREASE.COMPLEXITY_FACTOR);
        this.depth = Math.max(ADJUSTMENT.DECREASE.MIN_DEPTH, this.depth - factor * ADJUSTMENT.DECREASE.DEPTH_FACTOR);
        // Increase time allocation (easier = more time)
        this.timeAllocation = Math.min(TIME_ALLOCATION.MAX, this.timeAllocation * (1 + factor * ADJUSTMENT.DECREASE.TIME_FACTOR));
        // Update level based on new complexity and depth
        this.updateLevel();
    }
    /**
     * Update the difficulty level based on complexity and depth
     */
    /**
     * Method updateLevel
     */
    updateLevel() {
        const average = (this.complexity + this.depth) / 2;
        if (average >= LEVEL_THRESHOLDS.EXPERT) {
            this.level = 'expert';
        }
        else if (average >= LEVEL_THRESHOLDS.ADVANCED) {
            this.level = 'advanced';
        }
        else if (average >= LEVEL_THRESHOLDS.INTERMEDIATE) {
            this.level = 'intermediate';
        }
        else {
            this.level = 'beginner';
        }
    }
    /**
     * Apply personality traits to modify difficulty
     * @param {Object} personalityTraits - User's personality traits
     */
    /**
     * Method applyPersonalityModifiers
     */
    applyPersonalityModifiers(personalityTraits) {
        if (!personalityTraits) {
            return;
        }
        // Adjust complexity based on openness and conscientiousness
        if (personalityTraits.openness > TRAIT_MODIFIERS.THRESHOLD) {
            this.complexity = Math.min(1.0, this.complexity + TRAIT_MODIFIERS.OPENNESS_COMPLEXITY);
        }
        if (personalityTraits.conscientiousness > TRAIT_MODIFIERS.THRESHOLD) {
            this.depth = Math.min(1.0, this.depth + TRAIT_MODIFIERS.CONSCIENTIOUSNESS_DEPTH);
        }
        // Adjust time allocation based on neuroticism
        if (personalityTraits.neuroticism > TRAIT_MODIFIERS.THRESHOLD) {
            this.timeAllocation = Math.round(this.timeAllocation * TRAIT_MODIFIERS.NEUROTICISM_TIME);
        }
        // Update level after applying modifiers
        this.updateLevel();
    }
    /**
     * Apply score to adjust difficulty adaptively
     * @param {number} score - User's score (0-100)
     */
    /**
     * Method adjustBasedOnScore
     */
    adjustBasedOnScore(score) {
        if (score < 0 || score > 100) {
            throw new AdaptiveValidationError('Score must be between 0 and 100');
        }
        // Calculate adjustment percentage based on score
        let adjustmentPercentage = 0;
        if (score > ADJUSTMENT.SCORE.HIGH_THRESHOLD) {
            // High score, increase difficulty
            adjustmentPercentage = ((score - ADJUSTMENT.SCORE.HIGH_THRESHOLD) / (100 - ADJUSTMENT.SCORE.HIGH_THRESHOLD)) * ADJUSTMENT.SCORE.HIGH_MAX_ADJUST;
            this.increase(adjustmentPercentage);
        }
        else if (score < ADJUSTMENT.SCORE.LOW_THRESHOLD) {
            // Low score, decrease difficulty
            adjustmentPercentage = ((ADJUSTMENT.SCORE.LOW_THRESHOLD - score) / ADJUSTMENT.SCORE.LOW_THRESHOLD) * ADJUSTMENT.SCORE.LOW_MAX_ADJUST;
            this.decrease(adjustmentPercentage);
        }
        // Set adaptive factor based on score
        this.adaptiveFactor = (score - ADJUSTMENT.SCORE.ADAPTIVE_CENTER) / ADJUSTMENT.SCORE.ADAPTIVE_RANGE;
    }
    /**
     * Convert to difficulty settings for challenge generator
     * @returns {Object} Difficulty settings
     */
    /**
     * Method toSettings
     */
    toSettings() {
        return {
            level: this.level,
            complexity: this.complexity,
            depth: this.depth,
            timeAllocation: Math.round(this.timeAllocation),
            adaptiveFactor: this.adaptiveFactor,
        };
    }
    /**
     * Set the difficulty score percentage
     * @param {number} percentage - Difficulty score percentage (0-100)
     * @throws {AdaptiveValidationError} If percentage is out of range
     */
    setPercentage(percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new AdaptiveValidationError('Percentage must be between 0 and 100');
        }
        this.percentage = percentage;
        this.code = this._calculateCodeFromPercentage(percentage);
    }

    /**
     * Set the difficulty score percentage based on an absolute score
     * @param {number} score - Absolute score (0-100)
     * @throws {AdaptiveValidationError} If score is out of range
     */
    setFromAbsoluteScore(score) {
        if (score < 0 || score > 100) {
            throw new AdaptiveValidationError('Score must be between 0 and 100');
        }
        // Assuming a linear mapping for now
        this.setPercentage(score);
    }
}
export default Difficulty;
