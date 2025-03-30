import { logger } from "../../core/infra/logging/logger.js";
import { supabaseClient } from "../../core/infra/db/supabaseClient.js";
'use strict';

/**
 * UserStatsViewService
 * 
 * Implements an event-driven denormalization pattern for user statistics.
 * This service maintains a denormalized view of user statistics by listening
 * to domain events and updating the view accordingly, eliminating the need
 * for cross-aggregate queries at read time.
 */
class UserStatsViewService {
    /**
     * Create a new UserStatsViewService
     * @param {Object} options - Service options
     * @param {Object} options.db - Database client
     * @param {Object} options.eventBus - Event bus for subscribing to domain events
     */
    constructor(options = {}) {
        this.db = options.db || supabaseClient;
        this.eventBus = options.eventBus;
        this.tableName = 'user_stats_view';
        this.logger = logger.child({ component: 'UserStatsViewService' });
        
        // Initialize event subscriptions
        this._initEventSubscriptions();
    }
    
    /**
     * Initialize event subscriptions
     * @private
     */
    _initEventSubscriptions() {
        if (!this.eventBus) {
            this.logger.warn('No event bus provided, skipping event subscriptions');
            return;
        }
        
        // Subscribe to relevant domain events
        this.eventBus.subscribe('CHALLENGE_COMPLETED', this._handleChallengeCompleted.bind(this));
        this.eventBus.subscribe('USER_CREATED', this._handleUserCreated.bind(this));
        this.eventBus.subscribe('USER_UPDATED', this._handleUserUpdated.bind(this));
        
        this.logger.info('Initialized event subscriptions for user stats view');
    }
    
    /**
     * Handle challenge completed event
     * @param {Object} event - Event data
     * @private
     */
    async _handleChallengeCompleted(event) {
        try {
            const { userId, challengeId, score, completionTime, focusArea } = event.payload;
            
            this.logger.debug('Handling challenge completed event', {
                userId,
                challengeId,
                focusArea
            });
            
            // Update user stats view
            await this.updateUserStats(userId, {
                lastChallengeCompleted: new Date(),
                [`totalChallengesBy${this._capitalize(focusArea)}`]: { increment: 1 },
                totalChallengesCompleted: { increment: 1 },
                averageScore: { updateAverage: score },
                totalScore: { increment: score },
                streakDays: { conditional: this._calculateStreak }
            });
        } catch (error) {
            this.logger.error('Error handling challenge completed event', {
                error: error.message,
                event: event,
                stack: error.stack
            });
        }
    }
    
    /**
     * Handle user created event
     * @param {Object} event - Event data
     * @private
     */
    async _handleUserCreated(event) {
        try {
            const { userId, email } = event.payload;
            
            this.logger.debug('Handling user created event', { userId });
            
            // Initialize user stats record
            await this._initializeUserStats(userId, email);
        } catch (error) {
            this.logger.error('Error handling user created event', {
                error: error.message,
                event: event,
                stack: error.stack
            });
        }
    }
    
    /**
     * Handle user updated event
     * @param {Object} event - Event data
     * @private
     */
    async _handleUserUpdated(event) {
        try {
            const { userId, focusArea } = event.payload;
            
            // Only process if focus area changed
            if (!focusArea) return;
            
            this.logger.debug('Handling user updated event with focus area change', {
                userId,
                focusArea
            });
            
            // Update primary focus area in stats view
            await this.updateUserStats(userId, {
                primaryFocusArea: focusArea
            });
        } catch (error) {
            this.logger.error('Error handling user updated event', {
                error: error.message,
                event: event,
                stack: error.stack
            });
        }
    }
    
    /**
     * Initialize user stats record
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @private
     */
    async _initializeUserStats(userId, email) {
        try {
            const initialStats = {
                id: userId,
                user_id: userId,
                email: email,
                total_challenges_completed: 0,
                average_score: 0,
                highest_score: 0,
                streak_days: 0,
                total_score: 0,
                last_challenge_completed: null,
                primary_focus_area: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { error } = await this.db
                .from(this.tableName)
                .upsert(initialStats)
                .select();
                
            if (error) {
                throw new Error(`Failed to initialize user stats: ${error.message}`);
            }
            
            this.logger.debug('Initialized user stats record', { userId });
        } catch (error) {
            this.logger.error('Error initializing user stats', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Update user stats
     * @param {string} userId - User ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated user stats
     */
    async updateUserStats(userId, updates) {
        try {
            // Get current stats
            const { data: currentStats, error: fetchError } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
                
            if (fetchError) {
                throw new Error(`Failed to fetch current user stats: ${fetchError.message}`);
            }
            
            // Initialize if not exists
            if (!currentStats) {
                this.logger.debug('User stats not found, initializing', { userId });
                await this._initializeUserStats(userId, '');
                return this.updateUserStats(userId, updates);
            }
            
            // Process updates object to handle special operations
            const processedUpdates = {};
            const dbUpdates = { updated_at: new Date().toISOString() };
            
            for (const [key, value] of Object.entries(updates)) {
                const dbKey = this._camelToSnake(key);
                
                // Handle special update operations
                if (typeof value === 'object' && value !== null) {
                    if ('increment' in value) {
                        dbUpdates[dbKey] = (currentStats[dbKey] || 0) + value.increment;
                    }
                    else if ('updateAverage' in value) {
                        const currentAvg = currentStats[dbKey] || 0;
                        const totalItems = currentStats.total_challenges_completed || 0;
                        
                        if (totalItems > 0) {
                            // Calculate new average: ((avg * count) + newValue) / (count + 1)
                            dbUpdates[dbKey] = ((currentAvg * totalItems) + value.updateAverage) / (totalItems + 1);
                        } else {
                            dbUpdates[dbKey] = value.updateAverage;
                        }
                    }
                    else if ('conditional' in value && typeof value.conditional === 'function') {
                        dbUpdates[dbKey] = value.conditional(currentStats);
                    }
                }
                else {
                    // Regular update
                    dbUpdates[dbKey] = value;
                }
            }
            
            // Update highest score if needed
            if (dbUpdates.average_score && (dbUpdates.average_score > (currentStats.highest_score || 0))) {
                dbUpdates.highest_score = dbUpdates.average_score;
            }
            
            // Apply updates
            const { data, error } = await this.db
                .from(this.tableName)
                .update(dbUpdates)
                .eq('user_id', userId)
                .select()
                .single();
                
            if (error) {
                throw new Error(`Failed to update user stats: ${error.message}`);
            }
            
            this.logger.debug('Updated user stats', {
                userId,
                updates: Object.keys(dbUpdates)
            });
            
            return data;
        } catch (error) {
            this.logger.error('Error updating user stats', {
                userId,
                updates,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Get user stats
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User stats or null if not found
     */
    async getUserStats(userId) {
        try {
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
                
            if (error) {
                throw new Error(`Failed to fetch user stats: ${error.message}`);
            }
            
            if (!data) {
                return null;
            }
            
            // Convert from snake_case to camelCase
            return this._snakeToCamel(data);
        } catch (error) {
            this.logger.error('Error fetching user stats', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Calculate streak days based on last challenge completion
     * @param {Object} currentStats - Current user stats
     * @returns {number} Updated streak days
     * @private
     */
    _calculateStreak(currentStats) {
        const lastCompletionDate = currentStats.last_challenge_completed 
            ? new Date(currentStats.last_challenge_completed) 
            : null;
        
        if (!lastCompletionDate) {
            return 1; // First challenge completed
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Check if last completion was yesterday
        if (lastCompletionDate.toDateString() === yesterday.toDateString()) {
            return (currentStats.streak_days || 0) + 1;
        }
        
        // Check if last completion was today
        if (lastCompletionDate.toDateString() === today.toDateString()) {
            return currentStats.streak_days || 1;
        }
        
        // Otherwise reset streak
        return 1;
    }
    
    /**
     * Convert camelCase to snake_case
     * @param {string} str - String to convert
     * @returns {string} Converted string
     * @private
     */
    _camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    
    /**
     * Convert an object with snake_case keys to camelCase keys
     * @param {Object} obj - Object to convert
     * @returns {Object} Converted object
     * @private
     */
    _snakeToCamel(obj) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = value;
        }
        return result;
    }
    
    /**
     * Capitalize the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     * @private
     */
    _capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export default UserStatsViewService; 