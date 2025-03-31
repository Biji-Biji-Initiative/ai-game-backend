import { v4 as uuidv4 } from "uuid";
import _domainEvents from "@/core/common/events/domainEvents.js";
'use strict';
/**
 *
 */
class Progress {
    /**
     * Create a progress instance
     * @param {Object} data - Progress data
     */
    /**
     * Method constructor
     */
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.userId = data.userId || data.user_id || null;
        this.focusArea = data.focusArea || data.focus_area || null;
        this.challengeId = data.challengeId || data.challenge_id || null;
        this.score = data.score !== undefined ? data.score : null;
        this.completionTime = data.completionTime || data.completion_time || null;
        this.skillLevels = data.skillLevels || data.skill_levels || {};
        this.strengths = data.strengths || [];
        this.weaknesses = data.weaknesses || [];
        this.completedChallenges = data.completedChallenges || data.completed_challenges || [];
        this.statistics = data.statistics || {
            totalChallenges: 0,
            averageScore: 0,
            highestScore: 0,
            averageCompletionTime: 0,
            streakDays: 0,
            lastActive: null,
        };
        this.status = data.status || 'active';
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
        this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
        // Initialize domain events collection
        this._domainEvents = [];
    }
    /**
     * Add a domain event to the collection
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    addDomainEvent(type, data) {
        if (!type) {
            throw new Error('Event type is required');
        }
        this._domainEvents.push({ type, data });
    }
    /**
     * Get collected domain events
     * @returns {Array} Collection of domain events
     */
    getDomainEvents() {
        return this._domainEvents;
    }
    /**
     * Clear collected domain events
     */
    clearDomainEvents() {
        this._domainEvents = [];
    }
    /**
     * Validate the progress model
     * @returns {Object} Validation result with isValid and errors properties
     */
    /**
     * Method validate
     */
    validate() {
        const errors = [];
        // Required fields
        if (!this.userId) {
            errors.push('User ID is required');
        }
        // Validate score if present
        if (this.score !== null && (isNaN(this.score) || this.score < 0 || this.score > 100)) {
            errors.push('Score must be a number between 0 and 100');
        }
        // Validate completion time if present
        if (this.completionTime !== null && (isNaN(this.completionTime) || this.completionTime < 0)) {
            errors.push('Completion time must be a positive number');
        }
        // Validate skill levels
        if (Object.entries(this.skillLevels).some(([_, level]) => isNaN(level) || level < 0 || level > 100)) {
            errors.push('Skill levels must be numbers between 0 and 100');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Record a challenge completion
     * @param {string} challengeId - Challenge ID
     * @param {number} score - Score achieved (0-100)
     * @param {number} completionTime - Time taken to complete in seconds
     * @param {Object} evaluationData - Additional evaluation data
     */
    /**
     * Method recordChallengeCompletion
     */
    recordChallengeCompletion(challengeId, score, completionTime, evaluationData = {}) {
        if (!challengeId) {
            throw new Error('Challenge ID is required');
        }
        if (isNaN(score) || score < 0 || score > 100) {
            throw new Error('Score must be a number between 0 and 100');
        }
        if (isNaN(completionTime) || completionTime < 0) {
            throw new Error('Completion time must be a positive number');
        }
        // Set challenge data
        this.challengeId = challengeId;
        this.score = score;
        this.completionTime = completionTime;
        // Add to completed challenges
        const completedChallenge = {
            id: challengeId,
            score,
            completionTime,
            completedAt: new Date().toISOString(),
        };
        // Don't add duplicates
        if (!this.completedChallenges.some(c => c.id === challengeId)) {
            this.completedChallenges.push(completedChallenge);
        }
        else {
            // Update existing entry
            this.completedChallenges = this.completedChallenges.map(c => c.id === challengeId ? completedChallenge : c);
        }
        // Update statistics
        this.updateStatistics();
        // Extract strengths and weaknesses if provided
        if (evaluationData.strengths) {
            this.strengths = evaluationData.strengths;
        }
        if (evaluationData.weaknesses) {
            this.weaknesses = evaluationData.weaknesses;
        }
        // Set skill levels if provided
        if (evaluationData.skillLevels && typeof evaluationData.skillLevels === 'object') {
            this.updateSkillLevels(evaluationData.skillLevels);
        }
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of publishing directly
        this.addDomainEvent('ChallengeProgressRecorded', {
            userId: this.userId,
            challengeId,
            score,
            completionTime,
            skillLevels: this.skillLevels,
        });
    }
    /**
     * Update skill levels
     * @param {Object} newSkillLevels - New skill levels to merge with existing ones
     */
    /**
     * Method updateSkillLevels
     */
    updateSkillLevels(newSkillLevels) {
        // Validate skill levels
        Object.entries(newSkillLevels).forEach(([skill, level]) => {
            if (isNaN(level) || level < 0 || level > 100) {
                throw new Error(`Skill level for ${skill} must be a number between 0 and 100`);
            }
        });
        // Merge skill levels
        this.skillLevels = {
            ...this.skillLevels,
            ...newSkillLevels,
        };
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of publishing directly
        this.addDomainEvent('SkillLevelsUpdated', {
            userId: this.userId,
            skillLevels: this.skillLevels,
        });
    }
    /**
     * Update progress statistics
     */
    /**
     * Method updateStatistics
     */
    updateStatistics() {
        const totalChallenges = this.completedChallenges.length;
        if (totalChallenges === 0) {
            return;
        }
        // Calculate statistics
        const scores = this.completedChallenges.map(c => c.score);
        const completionTimes = this.completedChallenges.map(c => c.completionTime);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalChallenges;
        const highestScore = Math.max(...scores);
        const averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / totalChallenges;
        // Get last activity date
        const lastActive = new Date().toISOString();
        // Calculate streak days (simplified version)
        // In a real implementation, this would check consecutive days
        const streakDays = this.statistics.streakDays || 0;
        this.statistics = {
            totalChallenges,
            averageScore,
            highestScore,
            averageCompletionTime,
            streakDays,
            lastActive,
        };
    }
    /**
     * Set the focus area for this progress
     * @param {string} focusArea - Focus area name
     */
    /**
     * Method setFocusArea
     */
    setFocusArea(focusArea) {
        this.focusArea = focusArea;
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of publishing directly
        this.addDomainEvent('ProgressFocusAreaSet', {
            userId: this.userId,
            focusArea,
        });
    }
}
export default Progress;
