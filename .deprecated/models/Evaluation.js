/**
 * Evaluation Model
 * Defines the schema and methods for challenge response evaluations in Supabase
 * 
 * @module Evaluation
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * Evaluation Schema Definition
 * This represents the structure of the 'evaluations' table in Supabase
 * 
 * CREATE TABLE evaluations (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   challenge_id UUID NOT NULL REFERENCES challenges(id),
 *   response_id UUID NOT NULL REFERENCES responses(id),
 *   thread_id TEXT NOT NULL,
 *   message_id TEXT NOT NULL,
 *   scores JSONB NOT NULL,
 *   feedback TEXT NOT NULL,
 *   strengths TEXT[] NOT NULL,
 *   areas_for_improvement TEXT[] NOT NULL,
 *   overall_score INTEGER NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * Evaluation class for interacting with the evaluations table in Supabase
 */
class Evaluation {
  /**
   * Find an evaluation by ID
   * @param {string} id - Evaluation ID
   * @returns {Promise<Object|null>} Evaluation object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding evaluation by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find evaluation: ${error.message}`);
    }
  }
  
  /**
   * Find an evaluation by response ID
   * @param {string} responseId - Response ID
   * @returns {Promise<Object|null>} Evaluation object or null if not found
   * @throws {Error} If database query fails
   */
  static async findByResponseId(responseId) {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('response_id', responseId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data;
    } catch (error) {
      logger.error(`Error finding evaluation by response ID: ${error.message}`, { responseId, error });
      throw new Error(`Failed to find evaluation: ${error.message}`);
    }
  }
  
  /**
   * Find evaluations by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Array>} Array of evaluation objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId, options = {}) {
    try {
      let query = supabase
        .from('evaluations')
        .select('*, challenges(title, type, difficulty, focus_area), responses(text)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding evaluations by user ID: ${error.message}`, { userId, options, error });
      throw new Error(`Failed to find evaluations: ${error.message}`);
    }
  }
  
  /**
   * Create a new evaluation
   * @param {Object} evaluationData - Evaluation data
   * @returns {Promise<Object>} Created evaluation object
   * @throws {Error} If evaluation creation fails
   */
  static async create(evaluationData) {
    try {
      // Validate required fields
      if (!evaluationData.user_id) throw new Error('User ID is required');
      if (!evaluationData.challenge_id) throw new Error('Challenge ID is required');
      if (!evaluationData.response_id) throw new Error('Response ID is required');
      if (!evaluationData.thread_id) throw new Error('Thread ID is required');
      if (!evaluationData.message_id) throw new Error('Message ID is required');
      if (!evaluationData.scores) throw new Error('Scores are required');
      if (!evaluationData.feedback) throw new Error('Feedback is required');
      if (!evaluationData.overall_score) throw new Error('Overall score is required');
      
      const { data, error } = await supabase
        .from('evaluations')
        .insert([{
          user_id: evaluationData.user_id,
          challenge_id: evaluationData.challenge_id,
          response_id: evaluationData.response_id,
          thread_id: evaluationData.thread_id,
          message_id: evaluationData.message_id,
          scores: evaluationData.scores,
          feedback: evaluationData.feedback,
          strengths: evaluationData.strengths || [],
          areas_for_improvement: evaluationData.areas_for_improvement || [],
          overall_score: evaluationData.overall_score
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the response with the evaluation ID
      await supabase
        .from('responses')
        .update({ evaluation_id: data.id })
        .eq('id', evaluationData.response_id);
      
      return data;
    } catch (error) {
      logger.error(`Error creating evaluation: ${error.message}`, { evaluationData, error });
      throw new Error(`Failed to create evaluation: ${error.message}`);
    }
  }
  
  /**
   * Get user performance metrics based on evaluations
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Performance metrics
   * @throws {Error} If metrics calculation fails
   */
  static async getUserPerformanceMetrics(userId) {
    try {
      // Get all evaluations for the user
      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select('*, challenges(focus_area, difficulty)')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (!evaluations || evaluations.length === 0) {
        return {
          overallAverage: 0,
          totalEvaluations: 0,
          focusAreaAverages: {},
          difficultyAverages: {},
          recentTrend: 'neutral',
          improvementAreas: []
        };
      }
      
      // Calculate overall average
      const overallAverage = evaluations.reduce((sum, eval) => sum + eval.overall_score, 0) / evaluations.length;
      
      // Calculate focus area averages
      const focusAreaScores = {};
      const focusAreaCounts = {};
      
      // Calculate difficulty averages
      const difficultyScores = {};
      const difficultyCounts = {};
      
      // Collect improvement areas
      const improvementAreasMap = {};
      
      evaluations.forEach(eval => {
        // Focus area calculations
        const focusArea = eval.challenges?.focus_area || 'unknown';
        if (!focusAreaScores[focusArea]) {
          focusAreaScores[focusArea] = 0;
          focusAreaCounts[focusArea] = 0;
        }
        focusAreaScores[focusArea] += eval.overall_score;
        focusAreaCounts[focusArea]++;
        
        // Difficulty calculations
        const difficulty = eval.challenges?.difficulty || 'unknown';
        if (!difficultyScores[difficulty]) {
          difficultyScores[difficulty] = 0;
          difficultyCounts[difficulty] = 0;
        }
        difficultyScores[difficulty] += eval.overall_score;
        difficultyCounts[difficulty]++;
        
        // Improvement areas tracking
        eval.areas_for_improvement.forEach(area => {
          if (!improvementAreasMap[area]) {
            improvementAreasMap[area] = 0;
          }
          improvementAreasMap[area]++;
        });
      });
      
      // Calculate averages by focus area
      const focusAreaAverages = {};
      Object.keys(focusAreaScores).forEach(area => {
        focusAreaAverages[area] = focusAreaScores[area] / focusAreaCounts[area];
      });
      
      // Calculate averages by difficulty
      const difficultyAverages = {};
      Object.keys(difficultyScores).forEach(difficulty => {
        difficultyAverages[difficulty] = difficultyScores[difficulty] / difficultyCounts[difficulty];
      });
      
      // Calculate recent trend (last 5 evaluations vs previous 5)
      let recentTrend = 'neutral';
      if (evaluations.length >= 10) {
        const recentEvals = evaluations.slice(0, 5);
        const previousEvals = evaluations.slice(5, 10);
        
        const recentAvg = recentEvals.reduce((sum, eval) => sum + eval.overall_score, 0) / 5;
        const previousAvg = previousEvals.reduce((sum, eval) => sum + eval.overall_score, 0) / 5;
        
        if (recentAvg > previousAvg + 5) {
          recentTrend = 'improving';
        } else if (recentAvg < previousAvg - 5) {
          recentTrend = 'declining';
        }
      }
      
      // Get top improvement areas
      const improvementAreas = Object.entries(improvementAreasMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([area]) => area);
      
      return {
        overallAverage: Math.round(overallAverage),
        totalEvaluations: evaluations.length,
        focusAreaAverages,
        difficultyAverages,
        recentTrend,
        improvementAreas
      };
    } catch (error) {
      logger.error(`Error calculating user performance metrics: ${error.message}`, { userId, error });
      throw new Error(`Failed to calculate performance metrics: ${error.message}`);
    }
  }
}

module.exports = Evaluation;
