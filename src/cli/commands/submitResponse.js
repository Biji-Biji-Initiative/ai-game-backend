/**
 * Submit Challenge Response Command
 * Handles challenge response submission functionality
 * Uses the unified service approach
 */
const { prompt } = require('../utils/cliPrompt');
const { 
  formatOutput, 
  formatSuccess, 
  formatError, 
  formatHeader 
} = require('../utils/formatter');

// Import container to access dependencies
const container = require('../../config/container');
const challengeCoordinator = container.get('challengeCoordinator');
const progressTrackingService = container.get('progressTrackingService');
const userJourneyCoordinator = container.get('userJourneyCoordinator');
const { logger } = require('../../core/infra/logging/logger');

/**
 * Submit a response to a challenge
 * @returns {Promise<Object|null>} - The evaluation result or null if submission failed
 */
async function submitChallengeResponse() {
  logger.info(formatHeader('Challenge Response Submission'));
  
  try {
    // Prompt for challenge ID
    const challengeId = await prompt('Challenge ID: ');
    
    try {
      // Get the challenge to determine its format
      const challenge = await challengeCoordinator.getChallengeById(challengeId);
      
      if (!challenge) {
        logger.info(formatError(`Challenge with ID ${challengeId} not found`));
        return null;
      }
      
      if (challenge.status === 'completed') {
        logger.info(formatError(`Challenge with ID ${challengeId} is already completed`));
        return null;
      }
      
      // Initialize responses array
      const responses = [];
      
      // Handle different challenge formats
      if (challenge.formatType === 'multiple-choice' && Array.isArray(challenge.content.questions)) {
        logger.info(formatHeader('Multiple Choice Questions'));
        
        // Process each question
        for (const question of challenge.content.questions) {
          logger.info(`\nQuestion: ${question.text}`);
          
          // Display options
          if (Array.isArray(question.options)) {
            question.options.forEach((option, index) => {
              logger.info(`${index + 1}. ${option}`);
            });
            
            const answerIndex = parseInt(await prompt('Select your answer (number): ')) - 1;
            const answer = question.options[answerIndex];
            
            responses.push({
              questionId: question.id,
              answer
            });
          }
        }
      } else if (challenge.formatType === 'scenario' || challenge.formatType === 'essay') {
        logger.info(formatHeader('Scenario Response'));
        
        if (challenge.content.prompt) {
          logger.info(`\nPrompt: ${challenge.content.prompt}`);
        }
        
        if (challenge.content.context) {
          logger.info(`\nContext: ${challenge.content.context}`);
        }
        
        logger.info('\nEnter your response (type "END" on a new line when finished):');
        
        let responseText = '';
        let line;
        
        while ((line = await prompt('')) !== 'END') {
          responseText += line + '\n';
        }
        
        responses.push({
          type: 'text',
          content: responseText.trim()
        });
      } else {
        logger.info(formatHeader('Free-form Response'));
        logger.info('\nEnter your response (type "END" on a new line when finished):');
        
        let responseText = '';
        let line;
        
        while ((line = await prompt('')) !== 'END') {
          responseText += line + '\n';
        }
        
        responses.push({
          type: 'text',
          content: responseText.trim()
        });
      }
      
      logger.info(formatHeader('Submitting Response'));
      logger.info('Please wait while your response is being evaluated...');
      
      // Call the unified service method
      const result = await challengeCoordinator.submitChallengeResponse({
        challengeId,
        responses,
        progressTrackingService,
        userJourneyCoordinator
      });
      
      logger.info(formatSuccess('\nResponse submitted and evaluated successfully!'));
      
      // Display evaluation
      if (result.evaluation) {
        logger.info(formatHeader('Evaluation'));
        
        if (result.evaluation.score !== undefined) {
          logger.info(`Score: ${result.evaluation.score}/10`);
        }
        
        if (result.evaluation.feedback) {
          logger.info(`\nFeedback: ${result.evaluation.feedback}`);
        }
        
        if (Array.isArray(result.evaluation.strengths) && result.evaluation.strengths.length > 0) {
          logger.info('\nStrengths:');
          result.evaluation.strengths.forEach((strength, index) => {
            logger.info(`${index + 1}. ${strength}`);
          });
        }
        
        if (Array.isArray(result.evaluation.improvementAreas) && result.evaluation.improvementAreas.length > 0) {
          logger.info('\nAreas for Improvement:');
          result.evaluation.improvementAreas.forEach((area, index) => {
            logger.info(`${index + 1}. ${area}`);
          });
        }
      }
      
      return result;
    } catch (serviceError) {
      logger.error('Error submitting challenge response', { 
        error: serviceError.message,
        stack: serviceError.stack,
        challengeId
      });
      
      logger.info(formatError(`\nFailed to submit response: ${serviceError.message}`));
      return null;
    }
  } catch (error) {
    logger.error('Unexpected error submitting challenge response', { 
      error: error.message,
      stack: error.stack
    });
    
    logger.info(formatError(`\nUnexpected error: ${error.message}`));
    return null;
  }
}

module.exports = {
  submitChallengeResponse
};
