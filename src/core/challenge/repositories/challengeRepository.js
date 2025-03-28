/**
 * Challenge Repository
 * 
 * Responsible for data access operations related to challenges.
 * Follows the repository pattern to abstract database access from domain logic.
 * Uses Supabase as the data store.
 * 
 * @module challengeRepository
 * @requires Challenge
 * @requires ChallengeSchema
 * @requires ChallengeError
 */

const Challenge = require('../models/Challenge');
const { 
  ChallengeSchema, 
  ChallengeUpdateSchema, 
  ChallengeSearchSchema, 
  SearchOptionsSchema 
} = require('../schemas/ChallengeSchema');
const { 
  ChallengeNotFoundError, 
  ChallengePersistenceError, 
  ChallengeValidationError,
  ChallengeDuplicateError,
  InvalidChallengeStatusTransitionError
} = require('../errors/ChallengeErrors');
const { challengeLogger } = require('../../../core/infra/logging/domainLogger');
const { eventBus, EventTypes } = require('../../common/events/domainEvents');

class ChallengeRepository {
  /**
   * Create a new ChallengeRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger = null) {
    this.supabase = supabase;
    this.tableName = 'challenges';
    this.logger = logger || challengeLogger.child({ component: 'repository:challenge' });
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @private
   */
  log(level, message, context = {}) {
    this.logger[level](message, context);
  }

  /**
   * Find a challenge by its ID
   * @param {string} id - Challenge ID
   * @returns {Promise<Challenge|null>} Challenge object or null if not found
   * @throws {ChallengePersistenceError} If database operation fails
   */
  async findById(id) {
    try {
      this.log('debug', 'Finding challenge by ID', { id });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.log('error', 'Error finding challenge by ID', { id, error });
        throw new ChallengePersistenceError(`Failed to fetch challenge: ${error.message}`);
      }
      
      if (!data) {
        this.log('debug', 'Challenge not found', { id });
        return null;
      }
      
      return Challenge.fromDatabase(data);
    } catch (error) {
      if (error instanceof ChallengePersistenceError) {
        throw error;
      }
      
      this.log('error', 'Error in findById', { id, error: error.message });
      throw new ChallengePersistenceError(`Failed to find challenge: ${error.message}`);
    }
  }

  /**
   * Find challenges by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array<Challenge>>} Array of challenges
   * @throws {ChallengePersistenceError} If database operation fails
   */
  async findByUserId(userId) {
    try {
      this.log('debug', 'Finding challenges by user ID', { userId });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        this.log('error', 'Error finding challenges by user ID', { userId, error });
        throw new ChallengePersistenceError(`Failed to fetch challenges: ${error.message}`);
      }
      
      return (data || []).map(record => Challenge.fromDatabase(record));
    } catch (error) {
      if (error instanceof ChallengePersistenceError) {
        throw error;
      }
      
      this.log('error', 'Error in findByUserId', { userId, error: error.message });
      throw new ChallengePersistenceError(`Failed to find challenges by user ID: ${error.message}`);
    }
  }

  /**
   * Find challenges by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Challenge>>} Array of challenges
   * @throws {ChallengePersistenceError} If database operation fails
   */
  async findByFocusArea(focusArea) {
    try {
      this.log('debug', 'Finding challenges by focus area', { focusArea });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('focus_area', focusArea);

      if (error) {
        this.log('error', 'Error finding challenges by focus area', { focusArea, error });
        throw new ChallengePersistenceError(`Failed to fetch challenges: ${error.message}`);
      }
      
      return (data || []).map(record => Challenge.fromDatabase(record));
    } catch (error) {
      if (error instanceof ChallengePersistenceError) {
        throw error;
      }
      
      this.log('error', 'Error in findByFocusArea', { focusArea, error: error.message });
      throw new ChallengePersistenceError(`Failed to find challenges by focus area: ${error.message}`);
    }
  }

  /**
   * Save a challenge to the database
   * @param {Challenge} challenge - Challenge to save
   * @returns {Promise<Challenge>} Saved challenge
   * @throws {ChallengeValidationError} If challenge fails validation
   * @throws {ChallengePersistenceError} If database operation fails
   * @throws {ChallengeDuplicateError} If challenge ID already exists during creation
   */
  async save(challenge) {
    try {
      if (!(challenge instanceof Challenge)) {
        throw new ChallengeValidationError('Can only save Challenge instances');
      }
      
      // Validate the challenge using Zod schema
      const challengeData = challenge.toDatabase();
      const validationResult = ChallengeSchema.safeParse(challenge.toObject());
      
      if (!validationResult.success) {
        this.log('error', 'Challenge validation failed', { 
          errors: validationResult.error.flatten() 
        });
        throw new ChallengeValidationError(`Challenge validation failed: ${validationResult.error.message}`, {
          metadata: { validationErrors: validationResult.error.flatten() }
        });
      }
      
      // Collect domain events for publishing after successful save
      const domainEvents = challenge.domainEvents ? [...challenge.domainEvents] : [];
      
      // Clear the events from the entity to prevent double-publishing
      if (domainEvents.length > 0) {
        challenge.clearEvents();
      }
      
      // Check if this is a new challenge or an update
      const existingChallenge = await this.findById(challenge.id).catch(() => null);
      const isUpdate = existingChallenge !== null;
      
      // Check for status transition validity if this is an update
      if (isUpdate && existingChallenge.status !== challenge.status) {
        const isValidTransition = this.isValidStatusTransition(existingChallenge.status, challenge.status);
        if (!isValidTransition) {
          throw new InvalidChallengeStatusTransitionError(
            `Cannot transition challenge status from ${existingChallenge.status} to ${challenge.status}`,
            {
              metadata: {
                currentStatus: existingChallenge.status,
                requestedStatus: challenge.status,
                challengeId: challenge.id
              }
            }
          );
        }
      }
      
      // Update the updatedAt timestamp
      challengeData.updated_at = new Date().toISOString();
      
      let result;
      
      if (isUpdate) {
        // Update existing challenge
        this.log('debug', 'Updating existing challenge', { id: challenge.id });
        
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(challengeData)
          .eq('id', challenge.id)
          .select()
          .single();
        
        if (error) {
          this.log('error', 'Error updating challenge', { id: challenge.id, error });
          throw new ChallengePersistenceError(`Failed to update challenge: ${error.message}`, {
            cause: error,
            metadata: { challengeId: challenge.id }
          });
        }
        
        result = data;
      } else {
        // Insert new challenge
        this.log('debug', 'Creating new challenge', { id: challenge.id });
        
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(challengeData)
          .select()
          .single();
        
        if (error) {
          this.log('error', 'Error creating challenge', { id: challenge.id, error });
          
          // Check if this is a duplicate key error
          if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            throw new ChallengeDuplicateError(`Challenge with ID ${challenge.id} already exists`, {
              cause: error,
              metadata: { challengeId: challenge.id }
            });
          }
          
          throw new ChallengePersistenceError(`Failed to create challenge: ${error.message}`, {
            cause: error,
            metadata: { challengeId: challenge.id }
          });
        }
        
        result = data;
      }
      
      this.log('debug', 'Saved challenge', { 
        id: challenge.id, 
        title: challenge.title 
      });
      
      // Create domain object from database result
      const savedChallenge = Challenge.fromDatabase(result);
      
      // Publish any collected domain events AFTER successful persistence
      if (domainEvents.length > 0) {
        try {
          this.log('debug', 'Publishing collected domain events', {
            id: savedChallenge.id,
            eventCount: domainEvents.length
          });
          
          // Publish the events one by one in sequence (maintaining order)
          for (const event of domainEvents) {
            await eventBus.publish(event);
          }
        } catch (eventError) {
          // Log event publishing error but don't fail the save operation
          this.log('error', 'Error publishing domain events', { 
            id: savedChallenge.id, 
            error: eventError.message 
          });
        }
      } 
      // If no specific events, but this is a new challenge, publish a creation event
      else if (!isUpdate) {
        try {
          this.log('debug', 'Publishing challenge created event', { id: savedChallenge.id });
          
          // Create the event here rather than asking the entity to create it
          const creationEvent = {
            type: EventTypes.CHALLENGE_CREATED,
            payload: {
              challengeId: savedChallenge.id,
              userId: savedChallenge.userId,
              challengeType: savedChallenge.challengeType,
              focusArea: savedChallenge.focusArea
            },
            timestamp: new Date().toISOString()
          };
          
          await eventBus.publish(creationEvent);
        } catch (eventError) {
          // Log event publishing error but don't fail the save operation
          this.log('error', 'Error publishing challenge created event', { 
            id: savedChallenge.id, 
            error: eventError.message 
          });
        }
      }
      
      return savedChallenge;
    } catch (error) {
      if (error instanceof ChallengeValidationError || 
          error instanceof ChallengePersistenceError ||
          error instanceof InvalidChallengeStatusTransitionError ||
          error instanceof ChallengeDuplicateError) {
        throw error;
      }
      
      this.log('error', 'Error saving challenge', { 
        id: challenge?.id,
        error: error.message,
        stack: error.stack 
      });
      
      throw new ChallengePersistenceError(
        `Failed to save challenge: ${error.message}`, 
        { cause: error, metadata: { challengeId: challenge?.id } }
      );
    }
  }
  
  /**
   * Check if a status transition is valid
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} True if transition is valid
   * @private
   */
  isValidStatusTransition(currentStatus, newStatus) {
    // Define valid transitions
    const validTransitions = {
      'draft': ['active', 'deleted'],
      'active': ['completed', 'expired', 'cancelled', 'deleted'],
      'completed': ['archived', 'deleted'],
      'expired': ['archived', 'deleted'],
      'cancelled': ['archived', 'deleted'],
      'archived': ['deleted'],
      'deleted': []
    };
    
    // Allow same-to-same transitions
    if (currentStatus === newStatus) {
      return true;
    }
    
    // Check against valid transitions map
    return validTransitions[currentStatus] && 
           validTransitions[currentStatus].includes(newStatus);
  }

  /**
   * Delete a challenge by ID
   * @param {string} id - Challenge ID to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {ChallengePersistenceError} If database operation fails
   */
  async deleteById(id) {
    try {
      this.log('debug', 'Deleting challenge', { id });
      
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);
      
      if (error) {
        this.log('error', 'Error deleting challenge', { id, error });
        throw new ChallengePersistenceError(`Failed to delete challenge: ${error.message}`);
      }
      
      this.log('debug', 'Deleted challenge', { id });
      return true;
    } catch (error) {
      if (error instanceof ChallengePersistenceError) {
        throw error;
      }
      
      this.log('error', 'Error in deleteById', { id, error: error.message });
      throw new ChallengePersistenceError(`Failed to delete challenge: ${error.message}`);
    }
  }

  /**
   * Find challenges by various criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.userId] - User ID
   * @param {string} [criteria.focusArea] - Focus area
   * @param {string} [criteria.difficulty] - Difficulty level
   * @param {boolean} [criteria.active] - Active status
   * @param {string} [criteria.type] - Challenge type
   * @param {Object} [options] - Search options
   * @param {number} [options.limit] - Maximum number of results
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.sortBy] - Field to sort by
   * @param {string} [options.sortOrder] - Sort order ('asc' or 'desc')
   * @returns {Promise<Array<Challenge>>} Array of matching challenges
   * @throws {ChallengeValidationError} If criteria or options fail validation
   * @throws {ChallengePersistenceError} If database operation fails
   */
  async findByCriteria(criteria = {}, options = {}) {
    try {
      // Validate search criteria and options
      const validCriteria = ChallengeSearchSchema.safeParse(criteria);
      const validOptions = SearchOptionsSchema.safeParse(options);
      
      if (!validCriteria.success) {
        throw new ChallengeValidationError(`Invalid search criteria: ${validCriteria.error.message}`);
      }
      
      if (!validOptions.success) {
        throw new ChallengeValidationError(`Invalid search options: ${validOptions.error.message}`);
      }
      
      this.log('debug', 'Finding challenges by criteria', { criteria, options });
      
      // Start building query
      let query = this.supabase
        .from(this.tableName)
        .select('*');
      
      // Apply filters based on criteria
      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }
      
      if (criteria.focusArea) {
        query = query.eq('focus_area', criteria.focusArea);
      }
      
      if (criteria.difficulty) {
        query = query.eq('difficulty', criteria.difficulty);
      }
      
      if (criteria.active !== undefined) {
        query = query.eq('status', criteria.active ? 'active' : 'inactive');
      }
      
      if (criteria.type) {
        query = query.eq('challenge_type', criteria.type);
      }
      
      // Apply sorting
      if (options.sortBy) {
        const sortField = this.convertToDatabaseField(options.sortBy);
        const sortDirection = options.sortOrder || 'asc';
        query = query.order(sortField, { ascending: sortDirection === 'asc' });
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        this.log('error', 'Error finding challenges by criteria', { criteria, options, error });
        throw new ChallengePersistenceError(`Failed to search challenges: ${error.message}`);
      }
      
      return (data || []).map(record => Challenge.fromDatabase(record));
    } catch (error) {
      if (error instanceof ChallengeValidationError ||
          error instanceof ChallengePersistenceError) {
        throw error;
      }
      
      this.log('error', 'Error in findByCriteria', { 
        criteria, 
        options, 
        error: error.message 
      });
      throw new ChallengePersistenceError(`Failed to search challenges: ${error.message}`);
    }
  }

  /**
   * Convert a camelCase field name to snake_case for database queries
   * @param {string} field - camelCase field name
   * @returns {string} snake_case field name
   * @private
   */
  convertToDatabaseField(field) {
    if (!field) return field;
    
    // Special case for common fields
    const fieldMap = {
      'userId': 'user_id',
      'focusArea': 'focus_area',
      'challengeType': 'challenge_type',
      'formatType': 'format_type',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'submittedAt': 'submitted_at',
      'completedAt': 'completed_at',
      'evaluationCriteria': 'evaluation_criteria',
      'recommendedResources': 'recommended_resources',
      'typeMetadata': 'type_metadata',
      'formatMetadata': 'format_metadata'
    };
    
    return fieldMap[field] || field.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}

module.exports = ChallengeRepository; 