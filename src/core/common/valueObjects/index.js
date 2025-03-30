import Email from "./Email.js";
import UserId from "./UserId.js";
import ChallengeId from "./ChallengeId.js";
import DifficultyLevel from "./DifficultyLevel.js";
import FocusArea from "./FocusArea.js";
import TraitScore from "./TraitScore.js";
'use strict';
/**
 * Safely create an Email value object
 * @param {string} email - Email string
 * @returns {Email|null} Email value object or null if invalid
 */
function createEmail(email) {
    try {
        return email ? new Email(email) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely create a UserId value object
 * @param {string} userId - User ID string
 * @returns {UserId|null} UserId value object or null if invalid
 */
function createUserId(userId) {
    try {
        return userId ? new UserId(userId) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely create a ChallengeId value object
 * @param {string} challengeId - Challenge ID string
 * @returns {ChallengeId|null} ChallengeId value object or null if invalid
 */
function createChallengeId(challengeId) {
    try {
        return challengeId ? new ChallengeId(challengeId) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely create a FocusArea value object
 * @param {string} focusArea - Focus area code or name
 * @returns {FocusArea|null} FocusArea value object or null if invalid
 */
function createFocusArea(focusArea) {
    try {
        return focusArea ? new FocusArea(focusArea) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely create a DifficultyLevel value object
 * @param {string|number} difficulty - Difficulty level
 * @returns {DifficultyLevel|null} DifficultyLevel value object or null if invalid
 */
function createDifficultyLevel(difficulty) {
    try {
        return difficulty !== undefined ? new DifficultyLevel(difficulty) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely create a TraitScore value object
 * @param {string} traitCode - Trait code
 * @param {number} score - Score value
 * @returns {TraitScore|null} TraitScore value object or null if invalid
 */
function createTraitScore(traitCode, score) {
    try {
        return traitCode && score !== undefined ? new TraitScore(traitCode, score) : null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Creates value objects from primitive values in an object
 * @param {Object} data - Object containing primitive values
 * @returns {Object} Object with value objects for supported types
 */
function createValueObjects(data) {
    if (!data) {
        return {};
    }
    const result = { ...data };
    // Convert email to Email VO
    if (data.email) {
        result.emailVO = createEmail(data.email);
    }
    // Convert userId to UserId VO
    if (data.userId) {
        result.userIdVO = createUserId(data.userId);
    }
    // Convert challengeId to ChallengeId VO
    if (data.challengeId) {
        result.challengeIdVO = createChallengeId(data.challengeId);
    }
    // Convert focusArea to FocusArea VO
    if (data.focusArea) {
        result.focusAreaVO = createFocusArea(data.focusArea);
    }
    // Convert difficulty to DifficultyLevel VO
    if (data.difficulty) {
        result.difficultyLevelVO = createDifficultyLevel(data.difficulty);
    }
    return result;
}
export { Email };
export { UserId };
export { ChallengeId };
export { DifficultyLevel };
export { FocusArea };
export { TraitScore };
export { createEmail };
export { createUserId };
export { createChallengeId };
export { createFocusArea };
export { createDifficultyLevel };
export { createTraitScore };
export { createValueObjects };
export default {
    Email,
    UserId,
    ChallengeId,
    DifficultyLevel,
    FocusArea,
    TraitScore,
    createEmail,
    createUserId,
    createChallengeId,
    createFocusArea,
    createDifficultyLevel,
    createTraitScore,
    createValueObjects
};
