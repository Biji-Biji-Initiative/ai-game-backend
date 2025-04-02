import { v4 as uuidv4 } from "uuid";
import { personalitySchema } from "#app/core/personality/schemas/personalitySchema.js";
import { TraitsValidationError, AttitudesValidationError } from "#app/core/personality/errors/PersonalityErrors.js";
import Entity from "#app/core/common/models/Entity.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
'use strict';
/**
 * Personality Domain Model
 *
 * This model represents a user's personality profile including traits,
 * AI attitudes, and insights in the system.
 * Uses Zod for data validation to ensure integrity.
 */
/**
 * Personality class
 * Represents a user's personality traits, AI attitudes, and insights
 */
class Personality extends Entity {
    /**
     * Create a personality instance
     * @param {Object} data - Personality data
     * @param {Object} options - Additional options
     * @param {Object} options.EventTypes - EventTypes constant object (optional)
     */
    constructor(data = {}, options = {}) {
        // Call Entity constructor with the id
        super(data.id);
        
        const personalityData = {
            id: this.id, // Already set by Entity constructor
            userId: data.userId || data.user_id || null,
            personalityTraits: data.personalityTraits || data.personality_traits || {},
            aiAttitudes: data.aiAttitudes || data.ai_attitudes || {},
            dominantTraits: data.dominantTraits || data.dominant_traits || [],
            traitClusters: data.traitClusters || data.trait_clusters || {},
            aiAttitudeProfile: data.aiAttitudeProfile || data.ai_attitude_profile || {},
            insights: data.insights || {},
            threadId: data.threadId || data.thread_id || null,
            createdAt: data.createdAt || data.created_at || new Date().toISOString(),
            updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
        };
        // Parse and validate with zod, using safeParse to handle errors
        const result = personalitySchema.safeParse(personalityData);
        if (result.success) {
            Object.assign(this, result.data);
        }
        else {
            // Still assign the data but log validation issues
            Object.assign(this, personalityData);
            console.warn('Personality data validation warning:', result.error.message);
        }
        
        // Store EventTypes if provided (needed for addDomainEvent)
        this.EventTypes = options.EventTypes; 
    }
    /**
     * Validate the personality model
     * @returns {Object} Validation result with isValid and errors properties
     */
    validate() {
        const result = personalitySchema.safeParse(this);
        if (result.success) {
            return {
                isValid: true,
                errors: [],
            };
        }
        else {
            // Extract error messages from Zod validation result
            const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            return {
                isValid: false,
                errors: errorMessages,
            };
        }
    }
    /**
     * Update personality traits
     * @param {Object} traits - New personality traits to merge with existing ones
     */
    updateTraits(traits) {
        // Create a copy for validation
        const traitsToValidate = { ...traits };
        // Validate trait values using the validator
        const validation = personalitySchema.shape.personalityTraits.safeParse(traitsToValidate);
        if (!validation.success) {
            throw new TraitsValidationError(`Invalid personality traits: ${validation.error.message}`);
        }
        // Merge traits
        this.personalityTraits = {
            ...this.personalityTraits,
            ...traits,
        };
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of directly publishing
        if (this.userId && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PERSONALITY_PROFILE_UPDATED, {
                userId: this.userId,
                personalityId: this.id,
                traits: this.personalityTraits,
                updateType: 'traits',
            });
        }
    }
    /**
     * Update AI attitudes
     * @param {Object} attitudes - New AI attitudes to merge with existing ones
     */
    updateAttitudes(attitudes) {
        // Create a copy for validation
        const attitudesToValidate = { ...attitudes };
        // Validate attitude values using the validator
        const validation = personalitySchema.shape.aiAttitudes.safeParse(attitudesToValidate);
        if (!validation.success) {
            throw new AttitudesValidationError(`Invalid AI attitudes: ${validation.error.message}`);
        }
        // Merge attitudes
        this.aiAttitudes = {
            ...this.aiAttitudes,
            ...attitudes,
        };
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of directly publishing
        if (this.userId && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PERSONALITY_PROFILE_UPDATED, {
                userId: this.userId,
                personalityId: this.id,
                aiAttitudes: this.aiAttitudes,
                updateType: 'attitudes',
            });
        }
    }
    /**
     * Set dominant traits based on personality analysis
     * @param {Array} dominantTraits - Array of dominant trait objects
     */
    setDominantTraits(dominantTraits) {
        this.dominantTraits = dominantTraits;
        this.updatedAt = new Date().toISOString();
    }
    /**
     * Set trait clusters based on personality analysis
     * @param {Object} traitClusters - Categorized trait clusters
     */
    setTraitClusters(traitClusters) {
        this.traitClusters = traitClusters;
        this.updatedAt = new Date().toISOString();
    }
    /**
     * Set AI attitude profile
     * @param {Object} aiAttitudeProfile - Categorized AI attitude profile
     */
    setAIAttitudeProfile(aiAttitudeProfile) {
        this.aiAttitudeProfile = aiAttitudeProfile;
        this.updatedAt = new Date().toISOString();
    }
    /**
     * Set insights generated from personality analysis
     * @param {Object} insights - Generated insights
     */
    setInsights(insights) {
        this.insights = insights;
        this.updatedAt = new Date().toISOString();
        // Add domain event instead of directly publishing
        if (this.userId && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.PERSONALITY_PROFILE_UPDATED, {
                userId: this.userId,
                personalityId: this.id,
                updateType: 'insights',
            });
        }
    }
    /**
     * Set the conversation thread ID for personality analysis
     * @param {string} threadId - Conversation thread ID
     */
    setThreadId(threadId) {
        this.threadId = threadId;
        this.updatedAt = new Date().toISOString();
    }
}
export default Personality;
