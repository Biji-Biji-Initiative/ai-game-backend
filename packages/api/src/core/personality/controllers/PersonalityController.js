'use strict';

import personalityErrors, { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError, ProfileNotFoundError, TraitsValidationError, AttitudesValidationError, InsightGenerationError, NoPersonalityDataError } from "../../../personality/errors/PersonalityErrors.js"";
"../../../personality/schemas/personalityApiSchemas.js313;
""../../../infra/logging/domainLogger.js461;
""../../../infra/errors/errorStandardization.js537;
""../../../common/valueObjects/index.js706;
""../../../infra/errors/AppError.js784;

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
}, {
  errorClass: AppError,
  statusCode: error => error.statusCode || 500
}];

class PersonalityController {
  /**
   * Create a new PersonalityController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.personalityService - Personality service
   */
  constructor(dependencies = {}) {
    const {
      personalityService
    } = dependencies;
    this.personalityService = personalityService;
    this.logger = personalityLogger.child('controller');
    
    // Apply standardized error handling to methods
    this.generateInsights = withControllerErrorHandling(
      this.generateInsights.bind(this),
      {
        methodName: 'generateInsights',
        domainName: 'personality',
        logger: this.logger,
        errorMappings: personalityControllerErrorMappings
      }
    );
    
    this.updatePersonalityTraits = withControllerErrorHandling(
      this.updatePersonalityTraits.bind(this),
      {
        methodName: 'updatePersonalityTraits',
        domainName: 'personality',
        logger: this.logger,
        errorMappings: personalityControllerErrorMappings
      }
    );
    
    this.updateAIAttitudes = withControllerErrorHandling(
      this.updateAIAttitudes.bind(this),
      {
        methodName: 'updateAIAttitudes',
        domainName: 'personality',
        logger: this.logger,
        errorMappings: personalityControllerErrorMappings
      }
    );
    
    this.getPersonalityProfile = withControllerErrorHandling(
      this.getPersonalityProfile.bind(this),
      {
        methodName: 'getPersonalityProfile',
        domainName: 'personality',
        logger: this.logger,
        errorMappings: personalityControllerErrorMappings
      }
    );
    
    this.submitAssessment = withControllerErrorHandling(
      this.submitAssessment.bind(this),
      {
        methodName: 'submitAssessment',
        domainName: 'personality',
        logger: this.logger,
        errorMappings: personalityControllerErrorMappings
      }
    );
  }
  /**
   * Generate insights for a user's personality
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async generateInsights(req, res, next) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Create UserId Value Object from primitive
    const userIdVO = createUserId(req.user.id);
    if (!userIdVO) {
      throw new PersonalityValidationError('Invalid user ID format');
    }
    
    this.logger.debug('Generating personality insights', {
      userId: userIdVO.value
    });
    
    // Generate insights using Value Object
    const insights = await this.personalityService.generateInsights(userIdVO);
    
    this.logger.info('Generated personality insights', {
      userId: userIdVO.value
    });
    
    // Return insights
    return res.success({
      insights
    }, 'Personality insights generated successfully');
  }
  /**
   * Update personality traits for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updatePersonalityTraits(req, res, next) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Create UserId Value Object from primitive
    const userIdVO = createUserId(req.user.id);
    if (!userIdVO) {
      throw new PersonalityValidationError('Invalid user ID format');
    }
    
    // Validate using Zod schema
    const validationResult = updatePersonalityTraitsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new TraitsValidationError('Invalid personality traits', {
        details: validationResult.error.format()
      });
    }
    
    const { personalityTraits } = validationResult.data;
    
    this.logger.debug('Updating personality traits', {
      userId: userIdVO.value,
      traitCount: Object.keys(personalityTraits).length
    });
    
    // Update personality traits using Value Object
    const profile = await this.personalityService.updatePersonalityTraits(userIdVO, personalityTraits);
    
    this.logger.info('Personality traits updated', {
      userId: userIdVO.value,
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
  }
  /**
   * Update AI attitudes for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateAIAttitudes(req, res, next) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Create UserId Value Object from primitive
    const userIdVO = createUserId(req.user.id);
    if (!userIdVO) {
      throw new PersonalityValidationError('Invalid user ID format');
    }
    
    // Validate using Zod schema
    const validationResult = updateAIAttitudesSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AttitudesValidationError('Invalid AI attitudes', {
        details: validationResult.error.format()
      });
    }
    
    const { aiAttitudes } = validationResult.data;
    
    this.logger.debug('Updating AI attitudes', {
      userId: userIdVO.value,
      attitudeCount: Object.keys(aiAttitudes).length
    });
    
    // Update AI attitudes using Value Object
    const profile = await this.personalityService.updateAIAttitudes(userIdVO, aiAttitudes);
    
    this.logger.info('AI attitudes updated', {
      userId: userIdVO.value,
      attitudeProfile: profile.aiAttitudeProfile.overall
    });
    
    // Return the updated profile
    return res.success({
      id: profile.id,
      aiAttitudes: profile.aiAttitudes,
      aiAttitudeProfile: profile.aiAttitudeProfile,
      updatedAt: profile.updatedAt
    }, 'AI attitudes updated successfully');
  }
  /**
   * Get personality profile for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getPersonalityProfile(req, res, next) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Create UserId Value Object from primitive
    const userIdVO = createUserId(req.user.id);
    if (!userIdVO) {
      throw new PersonalityValidationError('Invalid user ID format');
    }
    
    // Parse query parameters with defaults
    let queryParams = {
      includeInsights: true,
      includeTraits: true,
      includeAttitudes: true
    };
    
    // Only attempt to validate query params if they exist
    if (Object.keys(req.query).length > 0) {
      const validationResult = profileQuerySchema.safeParse(req.query);
      if (validationResult.success) {
        queryParams = validationResult.data;
      } else {
        this.logger.warn('Invalid query parameters, using defaults', {
          userId: userIdVO.value,
          params: req.query,
          errors: validationResult.error.format()
        });
      }
    }
    
    this.logger.debug('Getting personality profile', {
      userId: userIdVO.value,
      params: queryParams
    });
    
    // Get personality profile using Value Object
    const profile = await this.personalityService.getPersonalityProfile(userIdVO, queryParams);
    if (!profile) {
      throw new ProfileNotFoundError(userIdVO.value);
    }
    
    this.logger.info('Personality profile retrieved', {
      userId: userIdVO.value
    });
    
    // Return the profile
    return res.success(profile, 'Personality profile retrieved successfully');
  }
  /**
   * Submit personality assessment answers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async submitAssessment(req, res, next) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Create UserId Value Object from primitive
    const userIdVO = createUserId(req.user.id);
    if (!userIdVO) {
      throw new PersonalityValidationError('Invalid user ID format');
    }
    
    const { answers } = req.body;
    
    this.logger.debug('Submitting personality assessment', {
      userId: userIdVO.value,
      answerCount: answers.length
    });
    
    // Process the assessment using Value Object
    const result = await this.personalityService.processAssessment(userIdVO, answers);
    
    this.logger.info('Personality assessment submitted', {
      userId: userIdVO.value,
      resultId: result.id
    });
    
    // Return success response
    return res.success({
      id: result.id,
      status: result.status,
      profileUpdated: result.profileUpdated
    }, 'Personality assessment submitted successfully');
  }
}
export default PersonalityController;"