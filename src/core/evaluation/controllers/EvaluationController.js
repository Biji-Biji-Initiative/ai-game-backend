/**
 * Evaluation Controller
 * 
 * Handles HTTP requests related to evaluation operations.
 */

const { container } = require('../../../config/container');
const logger = container.get('logger');

class EvaluationController {
  constructor() {
    this.evaluationService = container.get('evaluationService');
    this.evaluationThreadService = require('../services/evaluationThreadService');
    this.challengeRepository = container.get('challengeRepository');
  }

  /**
   * Create an evaluation for a challenge response
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async createEvaluation(req, res) {
    try {
      const { challengeId, userResponse } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!challengeId || !userResponse) {
        return res.status(400).json({
          status: 'error',
          message: 'Challenge ID and user response are required'
        });
      }

      // Get challenge from repository
      const challenge = await this.challengeRepository.findById(challengeId);
      
      if (!challenge) {
        return res.status(404).json({
          status: 'error',
          message: 'Challenge not found'
        });
      }
      
      // Add user information to challenge object for the evaluation service
      challenge.userId = userId;
      
      // Create a thread for the evaluation
      const threadMetadata = await this.evaluationThreadService.createChallengeEvaluationThread(
        userId, 
        challengeId
      );
      
      // Generate the evaluation
      const evaluation = await this.evaluationService.evaluateResponse(
        challenge, 
        userResponse, 
        { threadId: threadMetadata.id }
      );
      
      return res.status(201).json({
        status: 'success',
        data: evaluation
      });
    } catch (error) {
      logger.error('Error creating evaluation', { error: error.message });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create evaluation'
      });
    }
  }

  /**
   * Get an evaluation by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getEvaluationById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get evaluation from repository
      const evaluation = await this.evaluationService.getEvaluationById(id);
      
      if (!evaluation) {
        return res.status(404).json({
          status: 'error',
          message: 'Evaluation not found'
        });
      }
      
      // Check if the user is authorized to access this evaluation
      if (evaluation.userId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this evaluation'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: evaluation
      });
    } catch (error) {
      logger.error('Error fetching evaluation', { error: error.message });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch evaluation'
      });
    }
  }

  /**
   * Get all evaluations for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getEvaluationsForUser(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if the user is authorized to access these evaluations
      if (userId !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access these evaluations'
        });
      }
      
      // Get evaluations from repository
      const evaluations = await this.evaluationService.getEvaluationsForUser(userId);
      
      return res.status(200).json({
        status: 'success',
        data: evaluations
      });
    } catch (error) {
      logger.error('Error fetching user evaluations', { error: error.message });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch evaluations'
      });
    }
  }

  /**
   * Get evaluations for a specific challenge
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getEvaluationsForChallenge(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      
      // Get evaluations from repository
      const evaluations = await this.evaluationService.getEvaluationsForChallenge(challengeId, userId);
      
      return res.status(200).json({
        status: 'success',
        data: evaluations
      });
    } catch (error) {
      logger.error('Error fetching challenge evaluations', { error: error.message });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch evaluations'
      });
    }
  }

  /**
   * Stream an evaluation for a challenge response
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async streamEvaluation(req, res) {
    try {
      const { challengeId, userResponse } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!challengeId || !userResponse) {
        return res.status(400).json({
          status: 'error',
          message: 'Challenge ID and user response are required'
        });
      }

      // Get challenge from repository
      const challenge = await this.challengeRepository.findById(challengeId);
      
      if (!challenge) {
        return res.status(404).json({
          status: 'error',
          message: 'Challenge not found'
        });
      }
      
      // Add user information to challenge object for the evaluation service
      challenge.userId = userId;
      
      // Create a thread for the evaluation
      const threadMetadata = await this.evaluationThreadService.createChallengeEvaluationThread(
        userId, 
        challengeId
      );
      
      // Set up server-sent events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream the evaluation
      let fullText = '';
      let completed = false;
      
      try {
        await this.evaluationService.streamEvaluation(challenge, userResponse, {
          onChunk: (chunk) => {
            fullText += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          },
          onComplete: async (text) => {
            completed = true;
            
            // Process the evaluation
            const evaluation = await this.evaluationService.processStreamedEvaluation(
              userId,
              challengeId,
              text,
              threadMetadata.id
            );
            
            // Send the completed message with evaluation ID
            res.write(`data: ${JSON.stringify({ 
              type: 'complete', 
              evaluationId: evaluation.id,
              score: evaluation.score,
              categoryScores: evaluation.categoryScores
            })}\n\n`);
            
            res.end();
          },
          onError: (error) => {
            if (!completed) {
              res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
              res.end();
            }
          }
        }, { threadId: threadMetadata.id });
      } catch (error) {
        if (!completed) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          res.end();
        }
      }
    } catch (error) {
      logger.error('Error streaming evaluation', { error: error.message });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to stream evaluation'
      });
    }
  }
}

module.exports = EvaluationController; 