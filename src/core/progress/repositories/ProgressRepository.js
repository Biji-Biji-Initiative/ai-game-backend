/**
 * Progress Repository
 * 
 * Handles data access operations for Progress domain model.
 */

const Progress = require('../models/Progress');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { progressLogger } = require('../../infra/logging/domainLogger');

/**
 * Error for progress repository operations
 */
class ProgressRepositoryError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProgressRepositoryError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for progress not found
 */
class ProgressNotFoundError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProgressNotFoundError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for progress validation issues
 */
class ProgressValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProgressValidationError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

class ProgressRepository {
  /**
   * Create a new ProgressRepository
   * @param {Object} supabase - Supabase client instance
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'user_progress';
    this.logger = logger || progressLogger.child({ component: 'repository:progress' });
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  log(level, message, meta = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, meta);
    }
  }

  /**
   * Find a progress record by ID
   * @param {string} id - Progress ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findById(id) {
    try {
      if (!id) {
        throw new ProgressValidationError('Progress ID is required');
      }
      
      this.log('debug', 'Finding progress by ID', { id });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Handle "not found" error
        if (error.code === 'PGRST116') {
          this.log('debug', 'Progress not found', { id });
          return null;
        }
        
        throw new ProgressRepositoryError(`Error fetching progress: ${error.message}`, {
          cause: error,
          metadata: { id }
        });
      }
      
      if (!data) {
        this.log('debug', 'Progress not found', { id });
        return null;
      }

      return new Progress(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding progress by ID', { 
        id, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to find progress: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Find a user's progress
   * @param {string} userId - User ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findByUserId(userId) {
    try {
      if (!userId) {
        throw new ProgressValidationError('User ID is required');
      }
      
      this.log('debug', 'Finding progress by user ID', { userId });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new ProgressRepositoryError(`Error fetching progress by user ID: ${error.message}`, {
          cause: error,
          metadata: { userId }
        });
      }
      
      if (!data) {
        this.log('debug', 'Progress not found for user', { userId });
        return null;
      }

      return new Progress(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding progress by user ID', { 
        userId, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to find progress by user ID: ${error.message}`, {
        cause: error,
        metadata: { userId }
      });
    }
  }

  /**
   * Find progress records by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Progress>>} Array of Progress objects
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findByFocusArea(focusArea) {
    try {
      if (!focusArea) {
        throw new ProgressValidationError('Focus area is required');
      }
      
      this.log('debug', 'Finding progress by focus area', { focusArea });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('focus_area', focusArea);

      if (error) {
        throw new ProgressRepositoryError(`Error fetching progress by focus area: ${error.message}`, {
          cause: error,
          metadata: { focusArea }
        });
      }

      this.log('debug', `Found ${data?.length || 0} progress records for focus area`, { focusArea });
      return (data || []).map(item => new Progress(item));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding progress by focus area', { 
        focusArea, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to find progress by focus area: ${error.message}`, {
        cause: error,
        metadata: { focusArea }
      });
    }
  }

  /**
   * Find a user's progress for a specific challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findByUserAndChallenge(userId, challengeId) {
    try {
      if (!userId) {
        throw new ProgressValidationError('User ID is required');
      }
      
      if (!challengeId) {
        throw new ProgressValidationError('Challenge ID is required');
      }
      
      this.log('debug', 'Finding progress for challenge', { userId, challengeId });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (error) {
        throw new ProgressRepositoryError(`Error fetching progress for challenge: ${error.message}`, {
          cause: error,
          metadata: { userId, challengeId }
        });
      }
      
      if (!data) {
        this.log('debug', 'Progress not found for challenge', { userId, challengeId });
        return null;
      }

      return new Progress(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding progress for challenge', { 
        userId, 
        challengeId,
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to find progress for challenge: ${error.message}`, {
        cause: error,
        metadata: { userId, challengeId }
      });
    }
  }

  /**
   * Save a progress record to the database (create or update)
   * @param {Progress} progress - Progress object to save
   * @returns {Promise<Progress>} Updated progress object
   * @throws {ProgressValidationError} If progress data is invalid
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async save(progress) {
    try {
      if (!progress) {
        throw new ProgressValidationError('Progress object is required');
      }
      
      if (!(progress instanceof Progress)) {
        throw new ProgressValidationError('Object must be a Progress instance');
      }
      
      // Validate progress before saving
      const validation = progress.validate();
      if (!validation.isValid) {
        throw new ProgressValidationError(`Invalid progress data: ${validation.errors.join(', ')}`, {
          metadata: { validationErrors: validation.errors }
        });
      }

      // Set created_at and updated_at if not already set
      const now = new Date().toISOString();
      if (!progress.createdAt) progress.createdAt = now;
      progress.updatedAt = now;

      // Generate ID if not present (for new records)
      if (!progress.id) progress.id = uuidv4();

      // Convert to database format
      const progressData = progress.toDatabase();
      
      this.log('debug', 'Saving progress record', { 
        id: progress.id, 
        userId: progress.userId,
        isNew: !progress.createdAt
      });

      // Upsert progress data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(progressData)
        .select()
        .single();

      if (error) {
        throw new ProgressRepositoryError(`Error saving progress: ${error.message}`, {
          cause: error,
          metadata: { id: progress.id, userId: progress.userId }
        });
      }
      
      this.log('debug', 'Progress record saved successfully', { id: data.id });

      // Return updated progress
      return new Progress(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error saving progress', { 
        id: progress?.id,
        userId: progress?.userId,
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to save progress: ${error.message}`, {
        cause: error,
        metadata: { id: progress?.id, userId: progress?.userId }
      });
    }
  }

  /**
   * Find all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Progress>>} Array of Progress objects
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findAllByUserId(userId) {
    try {
      if (!userId) {
        throw new ProgressValidationError('User ID is required');
      }
      
      this.log('debug', 'Finding all progress for user', { userId });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new ProgressRepositoryError(`Error fetching all progress for user: ${error.message}`, {
          cause: error,
          metadata: { userId }
        });
      }
      
      this.log('debug', `Found ${data?.length || 0} progress records for user`, { userId });

      return (data || []).map(item => new Progress(item));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding all progress for user', { 
        userId, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to find all progress for user: ${error.message}`, {
        cause: error,
        metadata: { userId }
      });
    }
  }

  /**
   * Delete a progress record
   * @param {string} id - Progress ID
   * @returns {Promise<boolean>} True if successful
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async delete(id) {
    try {
      if (!id) {
        throw new ProgressValidationError('Progress ID is required');
      }
      
      this.log('debug', 'Deleting progress record', { id });
      
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new ProgressRepositoryError(`Error deleting progress: ${error.message}`, {
          cause: error,
          metadata: { id }
        });
      }
      
      this.log('debug', 'Progress record deleted successfully', { id });

      return true;
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error deleting progress', { 
        id, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to delete progress: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Delete all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async deleteAllForUser(userId) {
    try {
      if (!userId) {
        throw new ProgressValidationError('User ID is required');
      }
      
      this.log('debug', 'Deleting all progress for user', { userId });
      
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new ProgressRepositoryError(`Error deleting user progress: ${error.message}`, {
          cause: error,
          metadata: { userId }
        });
      }
      
      this.log('debug', 'All progress records deleted for user', { userId });

      return true;
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof ProgressRepositoryError ||
          error instanceof ProgressValidationError) {
        throw error;
      }
      
      this.log('error', 'Error deleting all progress for user', { 
        userId, 
        error: error.message,
        stack: error.stack
      });
      
      throw new ProgressRepositoryError(`Failed to delete all progress for user: ${error.message}`, {
        cause: error,
        metadata: { userId }
      });
    }
  }
}

module.exports = ProgressRepository;
module.exports.ProgressRepositoryError = ProgressRepositoryError;
module.exports.ProgressNotFoundError = ProgressNotFoundError;
module.exports.ProgressValidationError = ProgressValidationError; 