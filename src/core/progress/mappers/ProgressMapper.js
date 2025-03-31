import Progress from "@/core/progress/models/Progress.js";
'use strict';
/**
 * ProgressMapper class
 * Responsible for mapping between Progress domain objects and database representation
 */
class ProgressMapper {
    /**
     * Convert a database record to a Progress domain entity
     * @param {Object} data - Database progress record
     * @returns {Progress} Progress domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Convert dates to proper format if needed
        const createdAt = data.created_at instanceof Date
            ? data.created_at
            : new Date(data.created_at || data.createdAt);
        const updatedAt = data.updated_at instanceof Date
            ? data.updated_at
            : new Date(data.updated_at || data.updatedAt);
        // Convert skill_levels and statistics from string to object if needed
        let skillLevels = data.skill_levels || data.skillLevels || {};
        if (typeof skillLevels === 'string') {
            try {
                skillLevels = JSON.parse(skillLevels);
            }
            catch {
                skillLevels = {};
            }
        }
        let statistics = data.statistics || {};
        if (typeof statistics === 'string') {
            try {
                statistics = JSON.parse(statistics);
            }
            catch {
                statistics = {
                    totalChallenges: 0,
                    averageScore: 0,
                    highestScore: 0,
                    averageCompletionTime: 0,
                    streakDays: 0,
                    lastActive: null,
                };
            }
        }
        // Convert completed_challenges from string to object if needed
        let completedChallenges = data.completed_challenges || data.completedChallenges || [];
        if (typeof completedChallenges === 'string') {
            try {
                completedChallenges = JSON.parse(completedChallenges);
            }
            catch {
                completedChallenges = [];
            }
        }
        // Convert arrays from string if needed
        let strengths = data.strengths || [];
        if (typeof strengths === 'string') {
            try {
                strengths = JSON.parse(strengths);
            }
            catch {
                strengths = [];
            }
        }
        let weaknesses = data.weaknesses || [];
        if (typeof weaknesses === 'string') {
            try {
                weaknesses = JSON.parse(weaknesses);
            }
            catch {
                weaknesses = [];
            }
        }
        // Convert from snake_case database format to camelCase domain format
        const progressData = {
            id: data.id,
            userId: data.user_id || data.userId,
            focusArea: data.focus_area || data.focusArea,
            challengeId: data.challenge_id || data.challengeId,
            score: data.score,
            completionTime: data.completion_time || data.completionTime,
            skillLevels,
            strengths,
            weaknesses,
            completedChallenges,
            statistics,
            status: data.status,
            createdAt,
            updatedAt,
        };
        // Create and return a new Progress domain entity
        return new Progress(progressData);
    }
    /**
     * Convert a Progress domain entity to database format
     * @param {Progress} progress - Progress domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(progress) {
        if (!progress) {
            return null;
        }
        // Handle objects that need to be stored as strings or JSON
        const skillLevels = typeof progress.skillLevels === 'object'
            ? progress.skillLevels
            : progress.skillLevels
                ? JSON.parse(progress.skillLevels)
                : {};
        const statistics = typeof progress.statistics === 'object'
            ? progress.statistics
            : progress.statistics
                ? JSON.parse(progress.statistics)
                : {};
        const completedChallenges = Array.isArray(progress.completedChallenges)
            ? progress.completedChallenges
            : progress.completedChallenges
                ? JSON.parse(progress.completedChallenges)
                : [];
        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: progress.id,
            user_id: progress.userId,
            focus_area: progress.focusArea,
            challenge_id: progress.challengeId,
            score: progress.score,
            completion_time: progress.completionTime,
            skill_levels: skillLevels,
            strengths: progress.strengths,
            weaknesses: progress.weaknesses,
            completed_challenges: completedChallenges,
            statistics: statistics,
            status: progress.status,
            created_at: progress.createdAt instanceof Date ? progress.createdAt.toISOString() : progress.createdAt,
            updated_at: progress.updatedAt instanceof Date ? progress.updatedAt.toISOString() : progress.updatedAt,
        };
    }
    /**
     * Convert an array of database records to Progress domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<Progress>} Array of Progress domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of Progress domain entities to database format
     * @param {Array<Progress>} progressItems - Array of Progress domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(progressItems) {
        if (!Array.isArray(progressItems)) {
            return [];
        }
        return progressItems.map(progress => this.toPersistence(progress));
    }
}
export default new ProgressMapper();
