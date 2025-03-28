/**
 * Evaluation Repository
 * Handles database operations for evaluations
 * 
 * @module EvaluationRepository
 * @requires supabaseClient
 * @requires logger
 * @requires Evaluation
 * @requires EvaluationSchema
 */

const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { logger } = require('../../../core/infra/logging/logger');
const Evaluation = require('../models/Evaluation');
const { 
  EvaluationSchema, 
  EvaluationUpdateSchema, 
  EvaluationSearchOptionsSchema 
} = require('../schemas/EvaluationSchema');

/**
 * Error for evaluation repository operations
 */
class EvaluationRepositoryError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EvaluationRepositoryError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for evaluation not found
 */
class EvaluationNotFoundError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EvaluationNotFoundError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for evaluation validation issues
 */
class EvaluationValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EvaluationValidationError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Class representing an Evaluation Repository
 */
class EvaluationRepository {
  /**
   * Create a new EvaluationRepository instance
   * @param {Object} supabase - Supabase client instance
   * @param {Object} customLogger - Custom logger instance
   */
  constructor(supabase, customLogger) {
    this.supabase = supabase || supabaseClient;
    this.logger = customLogger || logger.child({ service: 'evaluationRepository' });
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
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
    }
  }

  /**
   * Create a new evaluation
   * @param {Object} evaluationData - Evaluation data
   * @returns {Promise<Object>} Created evaluation
   * @throws {EvaluationValidationError} If validation fails
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async createEvaluation(evaluationData) {
    try {
      if (!evaluationData) {
        throw new EvaluationValidationError('Evaluation data is required');
      }
      
      // Validate the evaluation data with Zod schema
      const validationResult = EvaluationSchema.safeParse(evaluationData);
    
      if (!validationResult.success) {
        this.log('error', 'Evaluation validation failed', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new EvaluationValidationError(`Evaluation validation failed: ${validationResult.error.message}`, {
          metadata: { validationErrors: validationResult.error.flatten() }
        });
      }
    
      // Use validated data
      const validData = validationResult.data;
      const { userId, challengeId, threadId } = validData;
      
      this.log('debug', 'Creating evaluation', { userId, challengeId });
      
      // Generate an evaluation ID if not provided
      const id = validData.id || Evaluation.createNewId();
      
      // Convert domain model fields to database fields (camelCase to snake_case)
      const dbData = {
        id,
        user_id: userId,
        challenge_id: challengeId,
        overall_score: validData.score,
        category_scores: validData.categoryScores || {},
        feedback: validData.overallFeedback,
        overall_feedback: validData.overallFeedback,
        strengths: validData.strengths || [],
        strength_analysis: validData.strengthAnalysis || [],
        areas_for_improvement: validData.areasForImprovement || [],
        next_steps: validData.nextSteps,
        thread_id: threadId,
        evaluation_thread_id: threadId,
        response_id: validData.responseId,
        metrics: validData.metrics || {},
        metadata: validData.metadata || {},
        created_at: validData.createdAt || new Date().toISOString(),
        updated_at: validData.updatedAt || new Date().toISOString()
      };
    
      // Insert into database
      const { data, error } = await this.supabase
        .from('evaluations')
        .insert([dbData])
        .select()
        .single();
      
      if (error) {
        throw new EvaluationRepositoryError(`Error creating evaluation: ${error.message}`, {
          cause: error,
          metadata: { userId, challengeId }
        });
      }
      
      this.log('info', 'Evaluation created successfully', { id, userId, challengeId });
      
      // Convert back to domain model
      return Evaluation.fromDatabase(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error creating evaluation', { 
        error: error.message, 
        stack: error.stack,
        userId: evaluationData?.userId,
        challengeId: evaluationData?.challengeId
      });
      
      throw new EvaluationRepositoryError(`Failed to create evaluation: ${error.message}`, {
        cause: error,
        metadata: { 
          userId: evaluationData?.userId, 
          challengeId: evaluationData?.challengeId 
        }
      });
    }
  }

  /**
   * Get evaluation by ID
   * @param {string} evaluationId - Evaluation ID
   * @returns {Promise<Object>} Evaluation object
   * @throws {EvaluationValidationError} If evaluation ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async getEvaluationById(evaluationId) {
    try {
      if (!evaluationId) {
        throw new EvaluationValidationError('Evaluation ID is required');
      }
      
      this.log('debug', 'Getting evaluation by ID', { evaluationId });
      
      const { data, error } = await this.supabase
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .single();
      
      if (error) {
        // Handle "not found" error
        if (error.code === 'PGRST116') {
          this.log('debug', 'Evaluation not found', { evaluationId });
          return null;
        }
        
        throw new EvaluationRepositoryError(`Error retrieving evaluation: ${error.message}`, {
          cause: error,
          metadata: { evaluationId }
        });
      }
      
      if (!data) {
        this.log('debug', 'Evaluation not found', { evaluationId });
        return null;
      }
      
      // Create domain model from database data
      return Evaluation.fromDatabase(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error getting evaluation by ID', { 
        error: error.message, 
        stack: error.stack,
        evaluationId 
      });
      
      throw new EvaluationRepositoryError(`Failed to get evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId }
      });
    }
  }

  /**
   * Update an evaluation
   * @param {string} evaluationId - Evaluation ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated evaluation
   * @throws {EvaluationValidationError} If validation fails
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async updateEvaluation(evaluationId, updateData) {
    try {
      if (!evaluationId) {
        throw new EvaluationValidationError('Evaluation ID is required for updates');
      }
      
      if (!updateData) {
        throw new EvaluationValidationError('Update data is required');
      }
      
      this.log('debug', 'Updating evaluation', { evaluationId });
      
      // Validate update data with Zod schema
      const validationResult = EvaluationUpdateSchema.safeParse(updateData);
      
      if (!validationResult.success) {
        this.log('error', 'Evaluation update validation failed', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new EvaluationValidationError(`Evaluation update validation failed: ${validationResult.error.message}`, {
          metadata: { validationErrors: validationResult.error.flatten() }
        });
      }
      
      // Use validated data
      const validData = validationResult.data;
      
      // Prepare update data (convert camelCase to snake_case)
      const dbUpdateData = {
        overall_score: validData.score,
        category_scores: validData.categoryScores,
        feedback: validData.overallFeedback,
        overall_feedback: validData.overallFeedback,
        strengths: validData.strengths,
        strength_analysis: validData.strengthAnalysis,
        areas_for_improvement: validData.areasForImprovement,
        next_steps: validData.nextSteps,
        thread_id: validData.threadId,
        evaluation_thread_id: validData.threadId,
        response_id: validData.responseId,
        metrics: validData.metrics,
        metadata: validData.metadata,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined fields
      Object.keys(dbUpdateData).forEach(key => {
        if (dbUpdateData[key] === undefined) {
          delete dbUpdateData[key];
        }
      });
      
      // Update in database
      const { data, error } = await this.supabase
        .from('evaluations')
        .update(dbUpdateData)
        .eq('id', evaluationId)
        .select()
        .single();
      
      if (error) {
        throw new EvaluationRepositoryError(`Error updating evaluation: ${error.message}`, {
          cause: error,
          metadata: { evaluationId }
        });
      }
      
      this.log('info', 'Evaluation updated successfully', { evaluationId });
      
      // Create domain model from database data
      return Evaluation.fromDatabase(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error updating evaluation', { 
        error: error.message, 
        stack: error.stack,
        evaluationId
      });
      
      throw new EvaluationRepositoryError(`Failed to update evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId }
      });
    }
  }

  /**
   * Delete an evaluation
   * @param {string} evaluationId - Evaluation ID
   * @returns {Promise<boolean>} Success indicator
   * @throws {EvaluationValidationError} If evaluation ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async deleteEvaluation(evaluationId) {
    try {
      if (!evaluationId) {
        throw new EvaluationValidationError('Evaluation ID is required for deletion');
      }
      
      this.log('debug', 'Deleting evaluation', { evaluationId });
      
      const { error } = await this.supabase
        .from('evaluations')
        .delete()
        .eq('id', evaluationId);
      
      if (error) {
        throw new EvaluationRepositoryError(`Error deleting evaluation: ${error.message}`, {
          cause: error,
          metadata: { evaluationId }
        });
      }
      
      this.log('info', 'Evaluation deleted successfully', { evaluationId });
      return true;
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error deleting evaluation', { 
        error: error.message, 
        stack: error.stack,
        evaluationId
      });
      
      throw new EvaluationRepositoryError(`Failed to delete evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId }
      });
    }
  }

  /**
   * Get evaluations for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Evaluations array
   * @throws {EvaluationValidationError} If user ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async getEvaluationsForUser(userId, options = {}) {
    try {
      if (!userId) {
        throw new EvaluationValidationError('User ID is required');
      }
      
      this.log('debug', 'Getting evaluations for user', { userId, options });
      
      // Validate options with Zod schema
      const validatedOptions = EvaluationSearchOptionsSchema.parse(options);
      
      const { limit = 10, offset = 0 } = validatedOptions;
      
      let query = this.supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      // Add challenge_id filter if provided
      if (validatedOptions.challengeId) {
        query = query.eq('challenge_id', validatedOptions.challengeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new EvaluationRepositoryError(`Error retrieving evaluations for user: ${error.message}`, {
          cause: error,
          metadata: { userId, options }
        });
      }
      
      this.log('debug', `Found ${data.length} evaluations for user`, { userId });
      
      // Convert database results to domain models
      return data.map(item => Evaluation.fromDatabase(item));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error getting evaluations for user', { 
        error: error.message, 
        stack: error.stack,
        userId
      });
      
      throw new EvaluationRepositoryError(`Failed to get evaluations for user: ${error.message}`, {
        cause: error,
        metadata: { userId, options }
      });
    }
  }

  /**
   * Save a domain model evaluation or update if exists
   * @param {Evaluation} evaluation - Evaluation domain model
   * @returns {Promise<Evaluation>} Saved evaluation
   * @throws {EvaluationValidationError} If evaluation is invalid
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async saveEvaluation(evaluation) {
    try {
      if (!evaluation) {
        throw new EvaluationValidationError('Evaluation object is required');
      }
      
      if (!(evaluation instanceof Evaluation)) {
        throw new EvaluationValidationError('Object must be an Evaluation instance');
      }
      
      if (!evaluation.isValid()) {
        throw new EvaluationValidationError('Invalid evaluation instance');
      }
      
      this.log('debug', 'Saving evaluation', { 
        id: evaluation.id, 
        userId: evaluation.userId,
        challengeId: evaluation.challengeId,
        isNew: !evaluation.id
      });

      const evaluationData = evaluation.toObject();
      const validationResult = EvaluationSchema.safeParse(evaluationData);

      if (!validationResult.success) {
        this.log('error', 'Evaluation validation failed during save', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new EvaluationValidationError(`Evaluation validation failed: ${validationResult.error.message}`, {
          metadata: { validationErrors: validationResult.error.flatten() }
        });
      }

      const existing = await this.getEvaluationById(evaluation.id).catch(() => null);

      if (existing) {
        return await this.updateEvaluation(evaluation.id, evaluation.toObject());
      } else {
        return await this.createEvaluation(evaluation.toObject());
      }
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error saving evaluation', { 
        error: error.message, 
        stack: error.stack,
        userId: evaluation?.userId, 
        challengeId: evaluation?.challengeId 
      });
      
      throw new EvaluationRepositoryError(`Failed to save evaluation: ${error.message}`, {
        cause: error,
        metadata: { 
          id: evaluation?.id,
          userId: evaluation?.userId, 
          challengeId: evaluation?.challengeId 
        }
      });
    }
  }

  /**
   * Count evaluations per challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<number>} Count of evaluations
   * @throws {EvaluationValidationError} If challenge ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async countEvaluationsForChallenge(challengeId) {
    try {
      if (!challengeId) {
        throw new EvaluationValidationError('Challenge ID is required');
      }
      
      this.log('debug', 'Counting evaluations for challenge', { challengeId });

      const { count, error } = await this.supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true})
        .eq('challenge_id', challengeId);

      if (error) {
        throw new EvaluationRepositoryError(`Error counting evaluations: ${error.message}`, {
          cause: error,
          metadata: { challengeId }
        });
      }

      return count || 0;
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error counting evaluations for challenge', { 
        error: error.message, 
        stack: error.stack,
        challengeId
      });
      
      throw new EvaluationRepositoryError(`Failed to count evaluations: ${error.message}`, {
        cause: error,
        metadata: { challengeId }
      });
    }
  }

  /**
   * Find evaluations for a challenge by user
   * @param {string} challengeId - Challenge ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Evaluations array
   * @throws {EvaluationValidationError} If challenge ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async findEvaluationsForChallenge(challengeId, userId) {
    try {
      if (!challengeId) {
        throw new EvaluationValidationError('Challenge ID is required');
      }
      
      this.log('debug', 'Finding evaluations for challenge', { challengeId, userId });

      let query = this.supabase
        .from('evaluations')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new EvaluationRepositoryError(`Error finding evaluations for challenge: ${error.message}`, { 
          cause: error,
          metadata: { challengeId, userId }
        });
      }
      
      this.log('debug', `Found ${data.length} evaluations for challenge`, { 
        challengeId, 
        userId 
      });

      return data.map(item => Evaluation.fromDatabase(item));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding evaluations for challenge', { 
        error: error.message, 
        stack: error.stack,
        challengeId,
        userId 
      });
      
      throw new EvaluationRepositoryError(`Failed to find evaluations for challenge: ${error.message}`, {
        cause: error,
        metadata: { challengeId, userId }
      });
    }
  }

  /**
   * Alias for getEvaluationById
   * @param {string} id - Evaluation ID
   * @returns {Promise<Evaluation|null>} Evaluation object or null
   */
  async findById(id) {
    return this.getEvaluationById(id);
  }

  /**
   * Alias for saveEvaluation
   * @param {Evaluation} evaluation - Evaluation to save
   * @returns {Promise<Evaluation>} Saved evaluation
   */
  async save(evaluation) {
    return this.saveEvaluation(evaluation);
  }

  /**
   * Alias for deleteEvaluation
   * @param {string} id - Evaluation ID
   * @returns {Promise<boolean>} Success indicator
   */
  async delete(id) {
    return this.deleteEvaluation(id);
  }

  /**
   * Alias for getEvaluationsForUser
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Evaluations array
   */
  async findByUserId(userId, options) {
    return this.getEvaluationsForUser(userId, options);
  }

  /**
   * Find a single evaluation by user and challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Evaluation|null>} Evaluation or null
   */
  async findByUserAndChallenge(userId, challengeId) {
    const results = await this.findEvaluationsForChallenge(challengeId, userId);
    return results[0] || null;
  }
}

module.exports = EvaluationRepository;
module.exports.EvaluationRepositoryError = EvaluationRepositoryError;
module.exports.EvaluationNotFoundError = EvaluationNotFoundError;
module.exports.EvaluationValidationError = EvaluationValidationError;