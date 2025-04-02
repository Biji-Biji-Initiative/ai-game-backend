'use strict';

import { v4 as uuidv4 } from "uuid";
import Entity from "#app/core/common/models/Entity.js";
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { UserJourneyValidationError } from "#app/core/userJourney/errors/userJourneyErrors.js";

// Constants for engagement levels etc.
const ENGAGEMENT_LEVELS = {
  NEW: 'new',
  ACTIVE: 'active',
  ENGAGED: 'engaged',
  CASUAL: 'casual',
  INACTIVE: 'inactive'
};

/**
 * Represents the overall journey and progress of a single user.
 * This acts as an Aggregate Root for User Journey events and state.
 * @extends Entity
 */
class UserJourney extends Entity {
    /**
     * Create a new UserJourney instance.
     * @param {Object} data - Initial data.
     * @param {string} data.userId - The ID of the user this journey belongs to.
     * @param {Array<UserJourneyEvent>} [data.events=[]] - Initial list of events.
     * @param {string} [data.id] - Optional ID, defaults to new UUID.
     * @param {Date|string} [data.lastActivity] - Timestamp of the last recorded activity.
     * @param {number} [data.sessionCount=0] - Number of distinct sessions.
     * @param {Date|string} [data.currentSessionStartedAt=null] - Start time of the current session.
     * @param {string} [data.engagementLevel=ENGAGEMENT_LEVELS.NEW] - Current engagement level.
     * @param {Object} [data.metrics={}] - Calculated metrics (e.g., totalChallenges, averageScore).
     * @param {Object} [data.metadata={}] - Additional metadata.
     * @param {Object} [options={}] - Options like EventTypes definition.
     */
    constructor(data = {}, options = {}) {
        super(data.id); // Pass ID to Entity constructor

        if (!data.userId) {
            throw new UserJourneyValidationError('userId is required to create a UserJourney');
        }

        this.userId = data.userId;
        // Ensure events are UserJourneyEvent instances
        this.events = Array.isArray(data.events) 
            ? data.events.map(evtData => evtData instanceof UserJourneyEvent ? evtData : new UserJourneyEvent(evtData))
            : [];
            
        // Initialize state fields before recalculation
        this.lastActivity = data.lastActivity ? new Date(data.lastActivity) : null;
        this.sessionCount = data.sessionCount || 0;
        this.currentSessionStartedAt = data.currentSessionStartedAt ? new Date(data.currentSessionStartedAt) : null;
        this.engagementLevel = data.engagementLevel || ENGAGEMENT_LEVELS.NEW;
        this.metrics = data.metrics || { totalChallenges: 0, averageScore: 0, streakDays: 0, lastChallenge: null }; // Initialize metrics object
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : this.createdAt;
        
        // Inherited from Entity
        // this._domainEvents = []; 
        this.EventTypes = options.EventTypes || EventTypes;

        // Initial calculation/update based on loaded events, if any
        if (this.events.length > 0 && !data.sessionCount) { // Only recalculate fully if state wasn't loaded
             this._recalculateStateFromEvents(options.config); 
        } else if (this.events.length > 0) {
            // If state was loaded, just ensure metrics/engagement are up-to-date
            this._calculateActivityMetrics();
            this._calculateEngagementLevel();
        }
    }

    /**
     * Adds a new event to the journey and updates the aggregate state.
     * @param {UserJourneyEvent} event - The event to add.
     * @param {Object} [options={}] - Options, e.g., config for session timeout.
     */
    addEvent(event, options = {}) {
        if (!(event instanceof UserJourneyEvent)) {
            // Attempt to create from plain object
            try {
                event = new UserJourneyEvent(event);
            } catch (err) {
                 throw new UserJourneyValidationError('Invalid event data provided to addEvent');
            }
        }
        if (event.userId !== this.userId) {
             throw new UserJourneyValidationError('Event userId does not match Journey userId');
        }

        this.events.push(event);
        this.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Keep sorted

        // Update state based on the new event
        this._updateSessionData(event.timestamp, options.config);
        this._calculateActivityMetrics();
        this._calculateEngagementLevel();
        
        // Phase calculation removed from here
        
        this.updatedAt = new Date();
        
        // Add domain event indicating the journey itself was updated
        this.addDomainEvent(this.EventTypes?.USER_JOURNEY_UPDATED || 'UserJourneyUpdated', {
            userId: this.userId,
            journeyId: this.id,
            lastEventType: event.type // Use event.type (standardized)
        });
    }
    
    /**
     * Recalculates summary state fields based on the current event list.
     * Should be called after loading events from persistence ONLY if state fields (sessionCount etc) were NOT loaded.
     * @private
     */
    _recalculateStateFromEvents(config) {
        if (this.events.length === 0) {
            this.lastActivity = null;
            this.engagementLevel = ENGAGEMENT_LEVELS.NEW;
            this.metrics = { totalChallenges: 0, averageScore: 0, streakDays: 0, lastChallenge: null };
            this.sessionCount = 0;
            this.currentSessionStartedAt = null;
            return;
        }
        
        // Ensure events are sorted by time
        this.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const lastEvent = this.events[this.events.length - 1];
        this.lastActivity = new Date(lastEvent.timestamp);
        
        // Recalculate metrics, engagement etc.
        this._calculateActivityMetrics(); // Uses this.events
        this._calculateEngagementLevel(); // Uses this.lastActivity
        
        // Phase calculation removed from here
        
        // Recalculate session data from scratch
        this.sessionCount = 0;
        this.currentSessionStartedAt = null;
        this.events.forEach(evt => this._updateSessionData(evt.timestamp, config));
        
        this.updatedAt = new Date();
    }

    // --- Logic Moved from Service --- 

    /**
     * Calculate user engagement level based on activity patterns
     * @private
     */
    _calculateEngagementLevel() {
        const now = new Date();
        // No previous activity
        if (!this.lastActivity) {
             this.engagementLevel = ENGAGEMENT_LEVELS.NEW;
             return;
        }
        // Check recency of last activity
        const daysSinceLastActivity = (now.getTime() - this.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastActivity < 2) {
             this.engagementLevel = ENGAGEMENT_LEVELS.ACTIVE;
        } else if (daysSinceLastActivity < 7) {
             this.engagementLevel = ENGAGEMENT_LEVELS.ENGAGED;
        } else if (daysSinceLastActivity < 30) {
             this.engagementLevel = ENGAGEMENT_LEVELS.CASUAL;
        } else {
             this.engagementLevel = ENGAGEMENT_LEVELS.INACTIVE;
        }
    }
    
    // Phase calculation method (_determineUserPhase) removed

    /**
     * Generate insights and recommendations based on the current journey state.
     * @returns {Object} Insights and personalized recommendations.
     */
    generateInsightsAndRecommendations() {
        const insights = [];
        const recommendations = [];
        // Phase is no longer stored here, so remove phase-based insights/recommendations
        // const phase = this.currentPhase; 
        const engagement = this.engagementLevel;
        
        // // Add phase-based insights (REMOVED)
        // switch (phase) { ... }

        // Add engagement-based insights
        switch (engagement) {
            case ENGAGEMENT_LEVELS.ACTIVE:
                insights.push('You are regularly engaged with learning');
                recommendations.push('Keep up the momentum with daily challenges');
                break;
            case ENGAGEMENT_LEVELS.ENGAGED:
                insights.push('You are maintaining consistent engagement');
                recommendations.push('Consider setting a schedule for more regular practice');
                break;
            case ENGAGEMENT_LEVELS.CASUAL:
                insights.push('Your engagement is occasional');
                recommendations.push('Try to establish a more consistent learning routine');
                break;
            case ENGAGEMENT_LEVELS.INACTIVE:
                insights.push('It has been a while since your last activity');
                recommendations.push('Start with a simple challenge to get back into practice');
                break;
            // No specific message for 'new' engagement level needed here
        }
        return { insights, recommendations };
    }

    /**
     * Calculate activity metrics from challenge events in the journey.
     * @private
     */
    _calculateActivityMetrics() {
        // Filter for challenge completion events (example)
        const challengeEvents = this.events.filter(event => 
            event.type === 'ChallengeCompleted' || // Use actual event type constants 
            event.type === this.EventTypes?.CHALLENGE_COMPLETED || 
            (event.eventData?.score !== undefined && event.challengeId) // Heuristic if type isn't specific
        );

        if (!challengeEvents || challengeEvents.length === 0) {
            this.metrics = { totalChallenges: 0, averageScore: 0, streakDays: 0, lastChallenge: null };
            return;
        }
        // Sort events by date
        const sortedEvents = [...challengeEvents].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        // Calculate metrics
        const lastChallengeTime = sortedEvents[0].timestamp;
        const scores = sortedEvents.map(event => event.eventData?.score).filter(s => typeof s === 'number');
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        
        // Calculate streak days
        const datesSorted = [...challengeEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(event => {
            const date = new Date(event.timestamp);
            // Normalize to date only (YYYY-MM-DD) to compare days
            return date.toISOString().split('T')[0]; 
        });
        
        // Count unique consecutive days
        let currentStreak = 0;
        let maxStreak = 0;
        let lastUniqueDateStr = null;
        
        if (datesSorted.length > 0) {
             currentStreak = 1;
             maxStreak = 1;
             lastUniqueDateStr = datesSorted[0];
        }
        
        for (let i = 1; i < datesSorted.length; i++) {
            const currentDateStr = datesSorted[i];
            
            // Skip if it's the same day as the last unique day counted
            if (currentDateStr === lastUniqueDateStr) {
                 continue;
            }
            
            // Calculate day difference
            const prevDate = new Date(lastUniqueDateStr + 'T00:00:00Z'); // Use UTC to avoid DST issues
            const currDate = new Date(currentDateStr + 'T00:00:00Z');
            const diffTime = currDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Use Math.round for closer approximation

            if (diffDays === 1) {
                currentStreak++;
            } else {
                currentStreak = 1; // Reset streak if not consecutive
            }
            
            maxStreak = Math.max(maxStreak, currentStreak);
            lastUniqueDateStr = currentDateStr; // Update last unique day
        }
        
        this.metrics = {
            totalChallenges: challengeEvents.length,
            averageScore: Math.round(averageScore * 100) / 100,
            streakDays: maxStreak,
            lastChallenge: lastChallengeTime
        };
    }

    /**
     * Update session data based on the timestamp of a new event.
     * @param {Date|string} eventTimestamp - Timestamp of the incoming event.
     * @param {Object} [config] - Application configuration containing session timeout.
     * @private
     */
    _updateSessionData(eventTimestamp, config) {
        // Get the session timeout value from config or use default
        const sessionTimeoutMinutes = config?.userJourney?.sessionTimeoutMinutes || 30;
        const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000; 
        
        const currentEventTime = new Date(eventTimestamp); // Use event time for consistency
        
        // If no previous session or session timeout has occurred, start a new session
        if (!this.currentSessionStartedAt || !this.lastActivity || (currentEventTime.getTime() - this.lastActivity.getTime() > sessionTimeoutMs)) {
            this.sessionCount = (this.sessionCount || 0) + 1;
            this.currentSessionStartedAt = currentEventTime;
            // Add domain event for session start?
            // this.addDomainEvent('UserSessionStarted', { ... });
        }
        // Always update the last activity time
        this.lastActivity = currentEventTime;
    }
    
    // --- Getters for calculated state --- 
    
    getEngagementLevel() {
        // Ensure it's calculated if needed
        if (!this.engagementLevel) this._calculateEngagementLevel();
        return this.engagementLevel;
    }
    
    // getCurrentPhase removed as phase is calculated externally
    
    getActivityMetrics() {
        // Ensure metrics are calculated if needed
        // if (!this.metrics || Object.keys(this.metrics).length === 0) this._calculateActivityMetrics();
        return { ...this.metrics }; // Return a copy
    }

}

export { UserJourney, ENGAGEMENT_LEVELS }; // Removed USER_JOURNEY_PHASES
export default UserJourney; 