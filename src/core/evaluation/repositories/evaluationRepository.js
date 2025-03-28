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
 * Class representing an Evaluation Repository
 */
class EvaluationRepository {
  /**
   * Create a new EvaluationRepository instance
   * @param {Object} supabase - Supabase client instance
   */
  constructor(supabase) {
    this.supabase = supabase || supabaseClient;
    this._log = logger.child({ service: 'evaluationRepository' });
  }
  
  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  _log(level, message, meta = {}) {
    if (this._log && typeof this._log[level] === 'function') {
      this._log[level](message, meta);
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
    }
  }

  /**
   * Create a new evaluation
   * @param {Object} evaluationData - Evaluation data
   * @returns {Promise<Object>} Created evaluation
   */
  async createEvaluation(evaluationData) {
    try {
      // Validate the evaluation data with Zod schema
      const validationResult = EvaluationSchema.safeParse(evaluationData);
    
      if (!validationResult.success) {
        this._log('error', 'Evaluation validation failed', { 
          errors: validationResult.error.flatten() 
        });
        throw new Error(`Evaluation validation failed: ${validationResult.error.message}`);
      }
    
      // Use validated data
      const validData = validationResult.data;
      const { userId, challengeId, threadId } = validData;
      
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
        this._log('error', 'Error creating evaluation', { error: error.message, userId, challengeId });
        throw error;
      }
      
      // Convert back to domain model
      return Evaluation.fromDatabase(data);
    } catch (error) {
      this._log('error', 'Error in createEvaluation', { error: error.message });
      throw error;
    }
  }

  /**
   * Get evaluation by ID
   * @param {string} evaluationId - Evaluation ID
   * @returns {Promise<Object>} Evaluation object
   */
  async getEvaluationById(evaluationId) {
    try {
      if (!evaluationId) {
      throw new Error('Evaluation ID is required');
    }
    
    const { data, error } = await this.supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .single();
    
    if (error) {
      this._log('error', 'Error retrieving evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    // Create domain model from database data
    return Evaluation.fromDatabase(data);
  } catch (error) {
    this._log('error', 'Error in getEvaluationById', { error: error.message, evaluationId });
    throw error;
  }
  }

  /**
   * Update an evaluation
   * @param {string} evaluationId - Evaluation ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated evaluation
   */
  async updateEvaluation(evaluationId, updateData) {
    try {
      if (!evaluationId) {
      throw new Error('Evaluation ID is required for updates');
    }
    
    // Validate update data with Zod schema
    const validationResult = EvaluationUpdateSchema.safeParse(updateData);
    
    if (!validationResult.success) {
      this._log('error', 'Evaluation update validation failed', { 
        errors: validationResult.error.flatten() 
      });
      throw new Error(`Evaluation update validation failed: ${validationResult.error.message}`);
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
      this._log('error', 'Error updating evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    this._log('info', 'Updated evaluation', { evaluationId });
    
    // Create domain model from database data
    return Evaluation.fromDatabase(data);
  } catch (error) {
    this._log('error', 'Error in updateEvaluation', { error: error.message, evaluationId, updateData });
    throw error;
  }
};

  /**
   * Delete an evaluation
   * @param {string} evaluationId - Evaluation ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteEvaluation(evaluationId) {
    try {
      if (!evaluationId) {
      throw new Error('Evaluation ID is required for deletion');
    }
    
    const { error } = await this.supabase
      .from('evaluations')
      .delete()
      .eq('id', evaluationId);
    
    if (error) {
      this._log('error', 'Error deleting evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    this._log('info', 'Deleted evaluation', { evaluationId });
    return true;
  } catch (error) {
    this._log('error', 'Error in deleteEvaluation', { error: error.message, evaluationId });
    throw error;
  }
  }

  /**
   * Get evaluations for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Evaluations array
   */
  async getEvaluationsForUser(userId, options = {}) {
    try {
      if (!userId) {
      throw new Error('User ID is required');
    }
    
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
      this._log('error', 'Error retrieving evaluations for user', { error: error.message, userId });
      throw error;
    }
    
    // Convert database results to domain models
    return data.map(item => Evaluation.fromDatabase(item));
  } catch (error) {
    this._log('error', 'Error in getEvaluationsForUser', { error: error.message, userId });
    throw error;
  }
  }

  /**
   * Save a domain model evaluation or update if exists
   * @param {Evaluation} evaluation - Evaluation domain model
   * @returns {Promise<Evaluation>} Saved evaluation
   */
  async saveEvaluation(evaluation) {
    try {
      if (!evaluation || !evaluation.isValid()) {
        throw new Error('Valid evaluation instance is required');
      }

      const evaluationData = evaluation.toObject();
      const validationResult = EvaluationSchema.safeParse(evaluationData);

      if (!validationResult.success) {
        this._log('error', 'Evaluation validation failed during save', { 
          errors: validationResult.error.flatten() 
        });
        throw new Error(`Evaluation validation failed: ${validationResult.error.message}`);
      }

      const { userId, challengeId } = evaluation;

      const existing = await this.getEvaluationById(evaluation.id).catch(() => null);

      if (existing) {
        const updated = await this.updateEvaluation(evaluation.id, evaluation.toObject());
        return updated;
      } else {
        const created = await this.createEvaluation(evaluation.toObject());
        return created;
      }
    } catch (error) {
      this._log('error', 'Error in saveEvaluation', { 
        error: error.message, 
        userId: evaluation?.userId, 
        challengeId: evaluation?.challengeId 
      });
      throw error;
    }
  }

  /**
   * Count evaluations per challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<number>} Count of evaluations
   */
  async countEvaluationsForChallenge(challengeId) {
    try {
      if (!challengeId) {
        throw new Error('Challenge ID is required');
      }

      const { count, error } = await this.supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true})
        .eq('challenge_id', challengeId);

      if (error) {
        this._log('error', 'Error counting evaluations', { error: error.message, challengeId });
        throw error;
      }

      return count || 0;
    } catch (error) {
      this._log('error', 'Error in countEvaluationsForChallenge', { error: error.message, challengeId });
      throw error;
    }
  }

  /**
   * Find evaluations for a challenge by user
   * @param {string} challengeId - Challenge ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Evaluations array
   */
  async findEvaluationsForChallenge(challengeId, userId) {
    try {
      if (!challengeId) {
        throw new Error('Challenge ID is required');
      }

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
        this._log('error', 'Error finding evaluations for challenge', { 
          error: error.message, 
          challengeId,
          userId 
        });
        throw error;
      }

      return data.map(item => Evaluation.fromDatabase(item));
    } catch (error) {
      this._log('error', 'Error in findEvaluationsForChallenge', { 
        error: error.message, 
        challengeId,
        userId 
      });
      throw error;
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

module.exports = EvaluationRepository