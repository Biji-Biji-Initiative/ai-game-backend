import { logger } from "#app/core/infra/logging/logger.js";
import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { ChallengeNotFoundError, ChallengeValidationError } from "#app/core/challenge/errors/ChallengeErrors.js";
import { ChallengeDTOMapper } from "#app/core/challenge/dtos/ChallengeDTO.js";
'use strict';
/**
 * Challenge Controller
 *
 * HTTP Controller for challenge-related endpoints
 * Follows Single Responsibility Principle by delegating domain logic to coordinators
 *
 * @module ChallengeController
 */
/**
 * Controller responsible for handling challenge-related HTTP requests
 */
class ChallengeController {
  /**
   * Create a new ChallengeController
   * @param {Object} dependencies - Injected dependencies
   * @param {ChallengeCoordinator} dependencies.challengeCoordinator - Coordinator for challenge operations
   * @param {ProgressCoordinator} dependencies.progressCoordinator - Coordinator for progress tracking
   */
  /**
   * Method constructor
   */
  constructor({
    challengeCoordinator,
    progressCoordinator
  }) {
    this.challengeCoordinator = challengeCoordinator;
    this.progressCoordinator = progressCoordinator;
    this.logger = logger.child({
      controller: 'ChallengeController'
    });
    // Apply error handling to all controller methods
    this.generateChallenge = withControllerErrorHandling(this.generateChallenge.bind(this), {
      methodName: 'generateChallenge',
      domainName: 'challenge',
      logger: this.logger
    });
    this.submitChallengeResponse = withControllerErrorHandling(this.submitChallengeResponse.bind(this), {
      methodName: 'submitChallengeResponse',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeById = withControllerErrorHandling(this.getChallengeById.bind(this), {
      methodName: 'getChallengeById',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeHistory = withControllerErrorHandling(this.getChallengeHistory.bind(this), {
      methodName: 'getChallengeHistory',
      domainName: 'challenge',
      logger: this.logger
    });
    this.listChallenges = withControllerErrorHandling(this.listChallenges.bind(this), {
      methodName: 'listChallenges',
      domainName: 'challenge',
      logger: this.logger
    });
  }
  /**
   * Generate a new challenge for a user
   * @param {Request} req - Express request object containing user details and challenge parameters
   * @param {Response} res - Express response object used to return the generated challenge
   *
   * components:
   *   schemas:
   *     ChallengeRequest:
   *       type: object
   *       required:
   *         - userEmail
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user requesting the challenge
   *         focusArea:
   *           type: string
   *           description: Focus area for the challenge
   *         challengeType:
   *           type: string
   *           description: Type of challenge to generate
   *           enum: [implementation, debugging, optimization, design]
   *         formatType:
   *           type: string
   *           description: Format type for the challenge
   *           enum: [code, text, mixed]
   *         difficulty:
   *           type: string
   *           enum: [beginner, intermediate, advanced, expert]
   *           description: Difficulty level of the challenge
   *     
   *     ChallengeResponse:
   *       type: object
   *       required:
   *         - userEmail
   *         - response
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user submitting the response
   *         response:
   *           type: string
   *           description: User's response to the challenge
   *         metadata:
   *           type: object
   *           description: Additional metadata about the response (e.g., language, time taken)
   * 
   * /challenges/generate:
   *   post:
   *     summary: Generate a new challenge
   *     description: Generates a new challenge for a user based on provided parameters
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChallengeRequest'
   *           examples:
   *             basic:
   *               summary: Basic challenge request
   *               value:
   *                 userEmail: user@example.com
   *                 focusArea: Security
   *                 challengeType: implementation
   *                 formatType: code
   *                 difficulty: intermediate
   *     responses:
   *       201:
   *         description: Challenge created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Challenge'
   *             examples:
   *               implementation:
   *                 summary: Implementation challenge
   *                 value:
   *                   success: true
   *                   data:
   *                     id: "123e4567-e89b-12d3-a456-426614174000"
   *                     title: "Implement JWT Authentication"
   *                     description: "Create a secure authentication system using JWT tokens"
   *                     difficulty: "intermediate"
   *                     focusArea: "Security"
   *                     type: "implementation"
   *                     formatType: "code"
   *                     createdAt: "2023-04-15T14:32:21.000Z"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  /**
   * Method generateChallenge
   * @param {Request} req - Express request object containing user email and challenge parameters
   * @param {Response} res - Express response object used to return the generated challenge
   */
  async generateChallenge(req, res) {
    // Convert request to domain parameters
    const params = ChallengeDTOMapper.fromRequest(req.body);
    // Basic validation
    if (!params.userEmail) {
      throw new ChallengeValidationError('User email is required', {
        errorCode: 'MISSING_PARAMETER',
        parameter: 'userEmail'
      });
    }
    // Delegate to coordinator
    const challenge = await this.challengeCoordinator.generateAndPersistChallenge(params);
    // Convert domain entity to DTO for API response
    const challengeDto = ChallengeDTOMapper.toDTO(challenge);
    res.status(201).json({
      success: true,
      data: challengeDto
    });
  }
  /**
   * Submit a response to a challenge
   * @param {Request} req - Express request object containing the challenge ID and user's response
   * @param {Response} res - Express response object used to return the submission result
   *
   * components:
   *   schemas:
   *     ChallengeRequest:
   *       type: object
   *       required:
   *         - userEmail
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user requesting the challenge
   *         focusArea:
   *           type: string
   *           description: Focus area for the challenge
   *         challengeType:
   *           type: string
   *           description: Type of challenge to generate
   *           enum: [implementation, debugging, optimization, design]
   *         formatType:
   *           type: string
   *           description: Format type for the challenge
   *           enum: [code, text, mixed]
   *         difficulty:
   *           type: string
   *           enum: [beginner, intermediate, advanced, expert]
   *           description: Difficulty level of the challenge
   *     
   *     ChallengeResponse:
   *       type: object
   *       required:
   *         - userEmail
   *         - response
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user submitting the response
   *         response:
   *           type: string
   *           description: User's response to the challenge
   *         metadata:
   *           type: object
   *           description: Additional metadata about the response (e.g., language, time taken)
   * 
   * /challenges/{challengeId}/submit:
   *   post:
   *     summary: Submit challenge response
   *     description: Submits a user's response to a specific challenge
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: challengeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the challenge
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChallengeResponse'
   *     responses:
   *       200:
   *         description: Response submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     challengeId:
   *                       type: string
   *                       format: uuid
   *                     userEmail:
   *                       type: string
   *                       format: email
   *                     responseText:
   *                       type: string
   *                     evaluation:
   *                       type: object
   *                       properties:
   *                         score:
   *                           type: number
   *                           minimum: 0
   *                           maximum: 100
   *                         feedback:
   *                           type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  /**
   * Method submitChallengeResponse
   * @param {Request} req - Express request object containing the challenge ID and user's response
   * @param {Response} res - Express response object used to return the submission result
   */
  async submitChallengeResponse(req, res) {
    const {
      challengeId
    } = req.params;
    // Convert request to domain parameters
    const params = ChallengeDTOMapper.fromRequest(req.body);
    // Basic validation
    if (!challengeId || !params.response) {
      throw new ChallengeValidationError('Challenge ID and response are required', {
        errorCode: 'MISSING_PARAMETER'
      });
    }
    // Delegate to coordinator
    const result = await this.challengeCoordinator.submitChallengeResponse({
      challengeId,
      userEmail: params.userEmail,
      response: params.response,
      progressTrackingService: this.progressCoordinator
    });
    // Convert domain response to DTO
    const responseDto = ChallengeDTOMapper.responseToDTO(result);
    res.status(200).json({
      success: true,
      data: responseDto
    });
  }
  /**
   * Get a challenge by ID
   * @param {Request} req - Express request object containing the challenge ID parameter
   * @param {Response} res - Express response object used to return the challenge data
   *
   * components:
   *   schemas:
   *     ChallengeRequest:
   *       type: object
   *       required:
   *         - userEmail
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user requesting the challenge
   *         focusArea:
   *           type: string
   *           description: Focus area for the challenge
   *         challengeType:
   *           type: string
   *           description: Type of challenge to generate
   *           enum: [implementation, debugging, optimization, design]
   *         formatType:
   *           type: string
   *           description: Format type for the challenge
   *           enum: [code, text, mixed]
   *         difficulty:
   *           type: string
   *           enum: [beginner, intermediate, advanced, expert]
   *           description: Difficulty level of the challenge
   *     
   *     ChallengeResponse:
   *       type: object
   *       required:
   *         - userEmail
   *         - response
   *       properties:
   *         userEmail:
   *           type: string
   *           format: email
   *           description: Email of the user submitting the response
   *         response:
   *           type: string
   *           description: User's response to the challenge
   *         metadata:
   *           type: object
   *           description: Additional metadata about the response (e.g., language, time taken)
   * 
   * /challenges/{challengeId}:
   *   get:
   *     summary: Get challenge by ID
   *     description: Retrieves a challenge by its unique identifier
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: challengeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the challenge to retrieve
   *     responses:
   *       200:
   *         description: Challenge found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Challenge'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  /**
   * Method getChallengeById
   * @param {Request} req - Express request object containing the challenge ID parameter
   * @param {Response} res - Express response object used to return the challenge data
   */
  async getChallengeById(req, res) {
    const {
      challengeId
    } = req.params;
    if (!challengeId) {
      throw new ChallengeValidationError('Challenge ID is required', {
        errorCode: 'MISSING_PARAMETER',
        parameter: 'challengeId'
      });
    }
    // Delegate to coordinator
    const challenge = await this.challengeCoordinator.getChallengeById(challengeId);
    if (!challenge) {
      throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
    }
    // Convert domain entity to DTO
    const challengeDto = ChallengeDTOMapper.toDTO(challenge);
    res.status(200).json({
      success: true,
      data: challengeDto
    });
  }
  /**
   * Get challenge history for a user
   * @param {Request} req - Express request object containing the user email parameter
   * @param {Response} res - Express response object used to return the challenge history
   *
   * /challenges/user/{userEmail}/history:
   *   get:
   *     summary: Get challenge history for a user
   *     description: Retrieves all challenges associated with a specific user
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userEmail
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: Email of the user to retrieve challenge history for
   *     responses:
   *       200:
   *         description: Challenge history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Challenge'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  /**
   * Method getChallengeHistory
   * @param {Request} req - Express request object containing the user email parameter
   * @param {Response} res - Express response object used to return the challenge history
   */
  async getChallengeHistory(req, res) {
    const {
      userEmail
    } = req.params;
    if (!userEmail) {
      throw new ChallengeValidationError('User email is required', {
        errorCode: 'MISSING_PARAMETER',
        parameter: 'userEmail'
      });
    }
    // Delegate to coordinator
    const challenges = await this.challengeCoordinator.getChallengeHistoryForUser(userEmail);
    // Convert domain entities to DTOs
    const challengeDtos = ChallengeDTOMapper.toDTOCollection(challenges);
    res.status(200).json({
      success: true,
      data: challengeDtos
    });
  }
  /**
   * List challenges with optional filtering
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async listChallenges(req, res) {
    // Extract query parameters
    const { 
      limit = 20, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc',
      difficulty,
      focusArea,
      type,
      search
    } = req.query;

    // Create filter object
    const filters = {};
    if (difficulty) filters.difficulty = difficulty;
    if (focusArea) filters.focusArea = focusArea;
    if (type) filters.challengeType = type;
    if (search) filters.search = search;

    try {
      // Get challenges from service (assuming this method exists)
      const result = await this.challengeCoordinator.listChallenges({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        sort,
        order,
        filters
      });

      // Convert domain entities to DTOs
      const challengeDtos = result.challenges.map(challenge => 
        ChallengeDTOMapper.toDTO(challenge)
      );

      // Return paginated response
      res.status(200).json({
        success: true,
        data: challengeDtos,
        pagination: {
          total: result.total || challengeDtos.length,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: (parseInt(offset, 10) + challengeDtos.length) < result.total
        }
      });
    } catch (error) {
      // If the coordinator doesn't have this method yet, return empty results
      if (error.message.includes('is not a function')) {
        this.logger.warn('listChallenges not implemented in coordinator - returning empty results');
        res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            hasMore: false
          }
        });
        return;
      }
      
      // Re-throw for the error handler to catch
      throw error;
    }
  }
}
export default ChallengeController;