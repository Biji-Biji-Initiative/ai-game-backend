/**
 * Evaluation API Routes
 * 
 * Endpoints for generating and retrieving evaluations
 */

const express = require('express');
const router = express.Router();
const evaluationService = require('../../core/evaluation/services/evaluationService');
const evaluationThreadService = require('../../core/evaluation/services/evaluationThreadService');
const evaluationRepository = require('../../repositories/evaluationRepository');
const authenticate = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { asyncHandler } = require('../../utils/asyncHandler');

/**
 * @route POST /api/evaluations
 * @desc Generate an evaluation for a challenge response
 * @access Private
 */
router.post('/', authenticate, validateRequest({
  body: {
    challengeId: { type: 'string', required: true },
    userResponse: { type: 'string', required: true }
  }
}), asyncHandler(async (req, res) => {
  const { challengeId, userResponse } = req.body;
  const userId = req.user.id;
  
  // Get challenge from database
  const { data: challenge } = await req.supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();
  
  if (!challenge) {
    return res.status(404).json({ 
      success: false, 
      message: 'Challenge not found' 
    });
  }
  
  // Add user information to challenge object for the evaluation service
  challenge.userId = userId;
  
  // Create a thread for the evaluation
  const threadMetadata = await evaluationThreadService.createChallengeEvaluationThread(
    userId, 
    challengeId
  );
  
  // Generate the evaluation
  const evaluation = await evaluationService.evaluateResponse(
    challenge, 
    userResponse, 
    { threadId: threadMetadata.id }
  );
  
  // Save the evaluation to the database
  const savedEvaluation = await evaluationRepository.saveEvaluation(evaluation);
  
  res.status(201).json({
    success: true,
    data: {
      id: savedEvaluation.id,
      userId: savedEvaluation.userId,
      challengeId: savedEvaluation.challengeId,
      score: savedEvaluation.score,
      categoryScores: savedEvaluation.categoryScores,
      overallFeedback: savedEvaluation.overallFeedback,
      strengths: savedEvaluation.strengths,
      strengthAnalysis: savedEvaluation.strengthAnalysis,
      areasForImprovement: savedEvaluation.areasForImprovement,
      nextSteps: savedEvaluation.nextSteps,
      metrics: savedEvaluation.metrics,
      createdAt: savedEvaluation.createdAt
    }
  });
}));

/**
 * @route GET /api/evaluations/:id
 * @desc Get an evaluation by ID
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const evaluation = await evaluationRepository.getEvaluationById(id);
  
  if (!evaluation) {
    return res.status(404).json({ 
      success: false, 
      message: 'Evaluation not found' 
    });
  }
  
  // Check if the user is authorized to access this evaluation
  if (evaluation.userId !== userId) {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to access this evaluation' 
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      id: evaluation.id,
      userId: evaluation.userId,
      challengeId: evaluation.challengeId,
      score: evaluation.score,
      categoryScores: evaluation.categoryScores,
      overallFeedback: evaluation.overallFeedback,
      strengths: evaluation.strengths,
      strengthAnalysis: evaluation.strengthAnalysis,
      areasForImprovement: evaluation.areasForImprovement,
      nextSteps: evaluation.nextSteps,
      metrics: evaluation.metrics,
      createdAt: evaluation.createdAt
    }
  });
}));

/**
 * @route GET /api/evaluations/user/:userId
 * @desc Get all evaluations for a user
 * @access Private
 */
router.get('/user/:userId', authenticate, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check if the user is authorized to access these evaluations
  if (userId !== req.user.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to access these evaluations' 
    });
  }
  
  const evaluations = await evaluationRepository.getEvaluationsForUser(userId);
  
  res.status(200).json({
    success: true,
    data: evaluations.map(evaluation => ({
      id: evaluation.id,
      userId: evaluation.userId,
      challengeId: evaluation.challengeId,
      score: evaluation.score,
      categoryScores: evaluation.categoryScores,
      strengths: evaluation.strengths.length,
      areasForImprovement: evaluation.areasForImprovement.length,
      metrics: evaluation.metrics,
      createdAt: evaluation.createdAt
    }))
  });
}));

/**
 * @route GET /api/evaluations/challenge/:challengeId
 * @desc Get evaluations for a specific challenge
 * @access Private
 */
router.get('/challenge/:challengeId', authenticate, asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const userId = req.user.id;
  
  // Get evaluations for this user and challenge
  const evaluations = await evaluationRepository.getEvaluationsForUser(userId, {
    challengeId
  });
  
  res.status(200).json({
    success: true,
    data: evaluations.map(evaluation => ({
      id: evaluation.id,
      score: evaluation.score,
      categoryScores: evaluation.categoryScores,
      overallFeedback: evaluation.overallFeedback,
      strengths: evaluation.strengths,
      strengthAnalysis: evaluation.strengthAnalysis,
      areasForImprovement: evaluation.areasForImprovement,
      nextSteps: evaluation.nextSteps,
      metrics: evaluation.metrics,
      createdAt: evaluation.createdAt
    }))
  });
}));

/**
 * @route POST /api/evaluations/stream
 * @desc Stream an evaluation for a challenge response
 * @access Private
 */
router.post('/stream', authenticate, validateRequest({
  body: {
    challengeId: { type: 'string', required: true },
    userResponse: { type: 'string', required: true }
  }
}), asyncHandler(async (req, res) => {
  const { challengeId, userResponse } = req.body;
  const userId = req.user.id;
  
  // Get challenge from database
  const { data: challenge } = await req.supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();
  
  if (!challenge) {
    return res.status(404).json({ 
      success: false, 
      message: 'Challenge not found' 
    });
  }
  
  // Add user information to challenge object for the evaluation service
  challenge.userId = userId;
  
  // Create a thread for the evaluation
  const threadMetadata = await evaluationThreadService.createChallengeEvaluationThread(
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
    await evaluationService.streamEvaluation(challenge, userResponse, {
      onChunk: (chunk) => {
        fullText += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      },
      onComplete: async (text) => {
        completed = true;
        
        // Create a basic evaluation object from the streamed text
        // Note: This is a simplified version without proper structure
        const evaluation = {
          userId,
          challengeId,
          score: 0, // This will be updated after processing
          overallFeedback: text,
          strengths: [],
          areasForImprovement: [],
          threadId: threadMetadata.id,
          createdAt: new Date().toISOString()
        };
        
        // Process the full text to extract structured data if possible
        try {
          // Look for JSON pattern in the text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            // Update evaluation with structured data
            evaluation.score = jsonData.overallScore || jsonData.score || 70;
            evaluation.categoryScores = jsonData.categoryScores || {};
            evaluation.overallFeedback = jsonData.overallFeedback || jsonData.feedback || text;
            evaluation.strengths = jsonData.strengths || [];
            evaluation.strengthAnalysis = jsonData.strengthAnalysis || [];
            evaluation.areasForImprovement = jsonData.areasForImprovement || [];
            evaluation.nextSteps = jsonData.nextSteps || '';
          }
        } catch (parseError) {
          console.error('Error parsing streamed evaluation:', parseError);
          // Continue with unstructured text if parsing fails
        }
        
        // Save the processed evaluation to the database
        const processedEvaluation = evaluationService.processEvaluation(evaluation);
        const savedEvaluation = await evaluationRepository.saveEvaluation(processedEvaluation);
        
        // Send the completed message with evaluation ID
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          evaluationId: savedEvaluation.id,
          score: savedEvaluation.score,
          categoryScores: savedEvaluation.categoryScores
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
}));

module.exports = router; 