/**
 * Evaluation Repository
 * Handles database operations for evaluations
 * 
 * @module evaluationRepository
 * @requires supabase
 * @requires logger
 */

const supabase = require('../../../lib/supabase');
const { logger } = require('../../../core/infra/logging/logger');
const Evaluation = require('../models/Evaluation');

// Helper function for logging if logger exists
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}

/**
 * Create a new evaluation
 * @param {Object} evaluationData - Evaluation data
 * @returns {Promise<Object>} Created evaluation
 */
const createEvaluation = async (evaluationData) => {
  try {
    const { userId, challengeId, threadId } = evaluationData;
    
    if (!userId || !challengeId) {
      throw new Error('User ID and Challenge ID are required to create an evaluation');
    }
    
    // Generate an evaluation ID if not provided
    const id = evaluationData.id || Evaluation.createNewId();
    
    // Convert domain model fields to database fields (camelCase to snake_case)
    const dbData = {
      id,
      user_id: userId,
      challenge_id: challengeId,
      overall_score: evaluationData.score,
      category_scores: evaluationData.categoryScores || {},
      feedback: evaluationData.overallFeedback,
      overall_feedback: evaluationData.overallFeedback,
      strengths: evaluationData.strengths || [],
      strength_analysis: evaluationData.strengthAnalysis || [],
      areas_for_improvement: evaluationData.areasForImprovement || [],
      next_steps: evaluationData.nextSteps,
      thread_id: threadId,
      evaluation_thread_id: threadId,
      response_id: evaluationData.responseId,
      metrics: evaluationData.metrics || {},
      metadata: evaluationData.metadata || {},
      created_at: evaluationData.createdAt || new Date().toISOString(),
      updated_at: evaluationData.updatedAt || new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('evaluations')
      .insert([dbData])
      .select()
      .single();
    
    if (error) {
      log('error', 'Error creating evaluation', { error: error.message, userId, challengeId });
      throw error;
    }
    
    // Convert back to domain model
    return Evaluation.fromDatabase(data);
  } catch (error) {
    log('error', 'Error in createEvaluation', { error: error.message });
    throw error;
  }
};

/**
 * Get evaluation by ID
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<Object>} Evaluation object
 */
const getEvaluationById = async (evaluationId) => {
  try {
    if (!evaluationId) {
      throw new Error('Evaluation ID is required');
    }
    
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .single();
    
    if (error) {
      log('error', 'Error retrieving evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    // Create domain model from database data
    return Evaluation.fromDatabase(data);
  } catch (error) {
    log('error', 'Error in getEvaluationById', { error: error.message, evaluationId });
    throw error;
  }
};

/**
 * Update an evaluation
 * @param {string} evaluationId - Evaluation ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated evaluation
 */
const updateEvaluation = async (evaluationId, updateData) => {
  try {
    if (!evaluationId) {
      throw new Error('Evaluation ID is required for updates');
    }
    
    // Prepare update data (convert camelCase to snake_case)
    const dbUpdateData = {
      overall_score: updateData.score,
      category_scores: updateData.categoryScores,
      feedback: updateData.overallFeedback,
      overall_feedback: updateData.overallFeedback,
      strengths: updateData.strengths,
      strength_analysis: updateData.strengthAnalysis,
      areas_for_improvement: updateData.areasForImprovement,
      next_steps: updateData.nextSteps,
      thread_id: updateData.threadId,
      evaluation_thread_id: updateData.threadId,
      response_id: updateData.responseId,
      metrics: updateData.metrics,
      metadata: updateData.metadata,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined fields
    Object.keys(dbUpdateData).forEach(key => {
      if (dbUpdateData[key] === undefined) {
        delete dbUpdateData[key];
      }
    });
    
    // Update in database
    const { data, error } = await supabase
      .from('evaluations')
      .update(dbUpdateData)
      .eq('id', evaluationId)
      .select()
      .single();
    
    if (error) {
      log('error', 'Error updating evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    log('info', 'Updated evaluation', { evaluationId });
    
    // Create domain model from database data
    return Evaluation.fromDatabase(data);
  } catch (error) {
    log('error', 'Error in updateEvaluation', { error: error.message, evaluationId, updateData });
    throw error;
  }
};

/**
 * Delete an evaluation
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<boolean>} Success indicator
 */
const deleteEvaluation = async (evaluationId) => {
  try {
    if (!evaluationId) {
      throw new Error('Evaluation ID is required for deletion');
    }
    
    const { error } = await supabase
      .from('evaluations')
      .delete()
      .eq('id', evaluationId);
    
    if (error) {
      log('error', 'Error deleting evaluation', { error: error.message, evaluationId });
      throw error;
    }
    
    log('info', 'Deleted evaluation', { evaluationId });
    return true;
  } catch (error) {
    log('error', 'Error in deleteEvaluation', { error: error.message, evaluationId });
    throw error;
  }
};

/**
 * Get evaluations for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} Evaluations array
 */
const getEvaluationsForUser = async (userId, options = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { limit = 10, offset = 0 } = options;
    
    let query = supabase
      .from('evaluations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add challenge_id filter if provided
    if (options.challengeId) {
      query = query.eq('challenge_id', options.challengeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      log('error', 'Error retrieving evaluations for user', { error: error.message, userId });
      throw error;
    }
    
    // Convert database results to domain models
    return data.map(item => Evaluation.fromDatabase(item));
  } catch (error) {
    log('error', 'Error in getEvaluationsForUser', { error: error.message, userId });
    throw error;
  }
};

/**
 * Save a domain model evaluation or update if exists
 * @param {Evaluation} evaluation - Evaluation domain model
 * @returns {Promise<Evaluation>} Saved evaluation
 */
const saveEvaluation = async (evaluation) => {
  try {
    if (!evaluation || !evaluation.isValid()) {
      throw new Error('Valid evaluation instance is required');
    }
    
    const { userId, challengeId } = evaluation;
    
    // Check if evaluation with this ID already exists
    const existing = await getEvaluationById(evaluation.id).catch(() => null);
    
    if (existing) {
      // Update existing evaluation
      const updated = await updateEvaluation(evaluation.id, evaluation.toObject());
      return updated;
    } else {
      // Create new evaluation
      const created = await createEvaluation(evaluation.toObject());
      return created;
    }
  } catch (error) {
    log('error', 'Error in saveEvaluation', { 
      error: error.message, 
      userId: evaluation?.userId, 
      challengeId: evaluation?.challengeId 
    });
    throw error;
  }
};

/**
 * Count evaluations per challenge
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<number>} Count of evaluations
 */
const countEvaluationsForChallenge = async (challengeId) => {
  try {
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    const { count, error } = await supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId);
    
    if (error) {
      log('error', 'Error counting evaluations', { error: error.message, challengeId });
      throw error;
    }
    
    return count || 0;
  } catch (error) {
    log('error', 'Error in countEvaluationsForChallenge', { error: error.message, challengeId });
    throw error;
  }
};

/**
 * Find evaluations for a challenge by user
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Evaluations array
 */
const findEvaluationsForChallenge = async (challengeId, userId) => {
  try {
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    let query = supabase
      .from('evaluations')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      log('error', 'Error finding evaluations for challenge', { 
        error: error.message, 
        challengeId,
        userId 
      });
      throw error;
    }
    
    // Convert database results to domain models
    return data.map(item => Evaluation.fromDatabase(item));
  } catch (error) {
    log('error', 'Error in findEvaluationsForChallenge', { 
      error: error.message, 
      challengeId,
      userId 
    });
    throw error;
  }
};

class EvaluationRepository {
  constructor() {
    // Instance methods just forward to module functions
    this.createEvaluation = createEvaluation;
    this.getEvaluationById = getEvaluationById;
    this.updateEvaluation = updateEvaluation;
    this.deleteEvaluation = deleteEvaluation;
    this.getEvaluationsForUser = getEvaluationsForUser;
    this.saveEvaluation = saveEvaluation;
    this.countEvaluationsForChallenge = countEvaluationsForChallenge;
    this.findEvaluationsForChallenge = findEvaluationsForChallenge;
    this.findById = getEvaluationById;
    this.save = saveEvaluation;
    this.delete = deleteEvaluation;
    this.findByUserId = getEvaluationsForUser;
    this.findByUserAndChallenge = (userId, challengeId) => 
      findEvaluationsForChallenge(challengeId, userId).then(results => results[0] || null);
  }
}

module.exports = EvaluationRepository; 