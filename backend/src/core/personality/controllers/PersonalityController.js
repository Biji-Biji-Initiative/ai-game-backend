'use strict';

import personalityErrors, { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError, ProfileNotFoundError, TraitsValidationError, AttitudesValidationError, InsightGenerationError, NoPersonalityDataError } from "#app/core/personality/errors/PersonalityErrors.js";
import { updatePersonalityTraitsSchema, updateAIAttitudesSchema, profileQuerySchema } from "#app/core/personality/schemas/personalityApiSchemas.js";
import { personalityLogger } from "#app/core/infra/logging/domainLogger.js";
import { applyRepositoryErrorHandling, applyServiceErrorHandling, withControllerErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
// Import PersonalityDTOMapper directly
import PersonalityDTOMapper from "#app/application/personality/mappers/PersonalityDTOMapper.js";

// Error mappings for controllers
const personalityControllerErrorMappings = [{
  errorClass: PersonalityNotFoundError,
  statusCode: 404
}, {
  errorClass: PersonalityValidationError,
  statusCode: 400
}, {
  errorClass: PersonalityProcessingError,
  statusCode: 500
}, {
  errorClass: PersonalityError,
  statusCode: 500
}];
class PersonalityController {
  /**
   * Create a new PersonalityController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.personalityService - Personality service
   */
  constructor(dependencies = {}) {
    const {
      personalityService,
      container
    } = dependencies;
    this.personalityService = personalityService;
    this.container = container; // Store container reference if provided
    this.logger = personalityLogger.child('controller');
  }
  /**
   * Generate insights for a user's personality
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async generateInsights(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      this.logger.debug('Generating personality insights', {
        userId: req.user.id
      });
      // Generate insights
      const insights = await this.personalityService.generateInsights(req.user.id);
      this.logger.info('Generated personality insights', {
        userId: req.user.id
      });
      // Return insights
      return res.success({
        insights
      }, 'Personality insights generated successfully');
    } catch (error) {
      this.logger.error('Error generating insights', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      if (error instanceof NoPersonalityDataError) {
        return next(error);
      }
      return next(new InsightGenerationError(error.message, {
        originalError: error
      }));
    }
  }
  /**
   * Update personality traits for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updatePersonalityTraits(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      // Validate using Zod schema
      const validationResult = updatePersonalityTraitsSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new TraitsValidationError('Invalid personality traits', {
          details: validationResult.error.format()
        });
      }
      const {
        personalityTraits
      } = validationResult.data;
      this.logger.debug('Updating personality traits', {
        userId: req.user.id,
        traitCount: Object.keys(personalityTraits).length
      });
      // Update personality traits
      const profile = await this.personalityService.updatePersonalityTraits(req.user.id, personalityTraits);
      this.logger.info('Personality traits updated', {
        userId: req.user.id,
        dominantTraits: profile.dominantTraits
      });
      // Return the updated profile
      return res.success({
        id: profile.id,
        personalityTraits: profile.personalityTraits,
        dominantTraits: profile.dominantTraits,
        traitClusters: profile.traitClusters,
        updatedAt: profile.updatedAt
      }, 'Personality traits updated successfully');
    } catch (error) {
      this.logger.error('Error updating personality traits', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      if (error instanceof TraitsValidationError) {
        return next(error);
      }
      return next(new TraitsValidationError(error.message, {
        originalError: error
      }));
    }
  }
  /**
   * Update AI attitudes for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateAIAttitudes(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      // Validate using Zod schema
      const validationResult = updateAIAttitudesSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new AttitudesValidationError('Invalid AI attitudes', {
          details: validationResult.error.format()
        });
      }
      const {
        aiAttitudes
      } = validationResult.data;
      this.logger.debug('Updating AI attitudes', {
        userId: req.user.id,
        attitudeCount: Object.keys(aiAttitudes).length
      });
      // Update AI attitudes
      const profile = await this.personalityService.updateAIAttitudes(req.user.id, aiAttitudes);
      this.logger.info('AI attitudes updated', {
        userId: req.user.id,
        attitudeProfile: profile.aiAttitudeProfile.overall
      });
      // Return the updated profile
      return res.success({
        id: profile.id,
        aiAttitudes: profile.aiAttitudes,
        aiAttitudeProfile: profile.aiAttitudeProfile,
        updatedAt: profile.updatedAt
      }, 'AI attitudes updated successfully');
    } catch (error) {
      this.logger.error('Error updating AI attitudes', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      if (error instanceof AttitudesValidationError) {
        return next(error);
      }
      return next(new AttitudesValidationError(error.message, {
        originalError: error
      }));
    }
  }
  /**
   * Get the user's personality profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @query {boolean} includeTraits - Whether to include personality traits
   * @query {boolean} includeAttitudes - Whether to include AI attitudes
   * @query {boolean} includeInsights - Whether to include generated insights
   */
  async getPersonalityProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { includeTraits, includeAttitudes, includeInsights } = req.query;

      // Call the correct service method: getProfile
      const profile = await this.personalityService.getProfile(userId);

      // Convert profile to DTO using the directly imported mapper
      // Rather than using container.resolve which might not be available
      const profileDto = PersonalityDTOMapper.toDTO(profile, {
        includeTraits: includeTraits === 'true',
        includeAttitudes: includeAttitudes === 'true',
        includeInsights: includeInsights === 'true'
      });

      // Use the exact response structure expected by OpenAPI spec:
      // { status: "success", data: { profile: {...} } }
      return res.json({
        status: "success",
        data: {
          profile: profileDto
        }
      });
    } catch (error) {
      this.logger.error('Error getting personality profile', {
        error: error.message,
        userId: req.user?.id,
        // stack: error.stack // Maybe omit stack in production logs
      });
      // Ensure next is called correctly ONLY ONCE in case of error
      // The centralized error handler should take care of the response
      next(error);
    }
  }
  /**
   * Submit personality assessment answers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async submitAssessment(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      const {
        answers
      } = req.body;
      this.logger.debug('Submitting personality assessment', {
        userId: req.user.id,
        answerCount: answers.length
      });
      // Process the assessment
      const result = await this.personalityService.processAssessment(req.user.id, answers);
      this.logger.info('Personality assessment submitted', {
        userId: req.user.id,
        resultId: result.id
      });
      // Return success response
      return res.success({
        id: result.id,
        status: result.status,
        profileUpdated: result.profileUpdated
      }, 'Personality assessment submitted successfully');
    } catch (error) {
      this.logger.error('Error submitting personality assessment', {
        error: error.message,
        userId: req.user?.id
      });
      if (error instanceof PersonalityValidationError) {
        return next(error);
      }
      return next(new PersonalityProcessingError(error.message, {
        originalError: error
      }));
    }
  }
}

export default PersonalityController;