import { v4 as uuidv4 } from "uuid";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { ProgressValidationError } from "#app/core/progress/errors/progressErrors.js";
'use strict';
/**
 *
 */
class Progress {
    /**
     * Create a progress instance
     * @param {Object} data - Progress data
     * @param {Object} options - Additional options
     */
    /**
     * Method constructor
     */
    constructor(data = {}, options = {}) {
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
        
        // Store EventTypes if provided
        this.EventTypes = options.EventTypes; 
        
        // Initialize domain events collection
        this._domainEvents = [];
    }
    /**
     * Add a domain event to the collection
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    addDomainEvent(eventType, eventData) {
        if (!this.EventTypes || !this.EventTypes[eventType]) {
           // console.warn(`[Progress Model] Unknown eventType constant used: ${eventType}. Cannot validate.`);
           // Or load dynamically as fallback?
        }
        // Use super.addDomainEvent if Progress extends Entity, otherwise:
        if (!eventType) { throw new ProgressValidationError('Event type is required when adding domain event'); }
        const event = { 
            type: eventType, 
            data: { 
                ...eventData, 
                entityId: this.id, 
                entityType: 'Progress'
            },
            metadata: { timestamp: new Date().toISOString() }
        };
        this._domainEvents.push(event);
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
            throw new ProgressValidationError('Challenge ID is required');
        }
        if (isNaN(score) || score < 0 || score > 100) {
            throw new ProgressValidationError('Score must be a number between 0 and 100');
        }
        if (isNaN(completionTime) || completionTime < 0) {
            throw new ProgressValidationError('Completion time must be a positive number');
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
        // Use this.EventTypes
        if (this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PROGRESS_UPDATED, { 
                userId: this.userId,
                challengeId,
                score,
                completionTime,
                skillLevels: this.skillLevels,
                area: 'challenge' // Specify area
            });
            // Add ACHIEVEMENT_UNLOCKED event based on score
            if (score >= 90) { // Example threshold
                 this.addDomainEvent(this.EventTypes.ACHIEVEMENT_UNLOCKED, { 
                      userId: this.userId,
                      achievementId: 'high_scorer',
                      achievementName: 'High Scorer',
                      description: 'Achieved 90+ on a challenge'
                 });
            }
        }
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
                throw new ProgressValidationError(`Skill level for ${skill} must be a number between 0 and 100`);
            }
        });
        // Merge skill levels
        this.skillLevels = {
            ...this.skillLevels,
            ...newSkillLevels,
        };
        this.updatedAt = new Date().toISOString();
        // Use this.EventTypes
        if (this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PROGRESS_UPDATED, { 
                userId: this.userId,
                skillLevels: this.skillLevels,
                area: 'skill_update' // Specify area
            });
        }
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
        // Use this.EventTypes
        if (this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PROGRESS_UPDATED, { 
                userId: this.userId,
                focusArea,
                area: 'focus_area_set' // Specify area
            });
        }
    }
}
export default Progress;
