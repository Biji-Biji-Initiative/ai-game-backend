import Email from "../../common/valueObjects/Email.js";
import UserId from "../../common/valueObjects/UserId.js";
import ChallengeId from "../../common/valueObjects/ChallengeId.js";
import DifficultyLevel from "../../common/valueObjects/DifficultyLevel.js";
import FocusArea from "../../common/valueObjects/FocusArea.js";
import TraitScore from "../../common/valueObjects/TraitScore.js";
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
    // eslint-disable-next-line no-unused-vars
    catch (_error) {
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
/**
 * Ensures a value is converted to a value object if it isn't already
 * @param {*} value - Value to ensure is a value object
 * @param {Function} VOClass - Value object class to check against
 * @param {Function} createFn - Function to create the value object
 * @returns {*} Value object instance or null if invalid
 */
function ensureVO(value, VOClass, createFn) {
    if (value instanceof VOClass) {
        return value;
    }
    return createFn(value);
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
export { ensureVO };
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
    createValueObjects,
    ensureVO
};
