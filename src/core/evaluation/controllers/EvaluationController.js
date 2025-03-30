import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationProcessingError } from "../../evaluation/errors/EvaluationErrors.js";
import { EvaluationDTOMapper } from "../../evaluation/dtos/EvaluationDTO.js";
import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
'use strict';
// Error mappings for controllers
const evaluationControllerErrorMappings = [
    { errorClass: EvaluationNotFoundError, statusCode: 404 },
    { errorClass: EvaluationValidationError, statusCode: 400 },
    { errorClass: EvaluationProcessingError, statusCode: 500 },
    { errorClass: EvaluationError, statusCode: 500 },
];

/**
 * @swagger
 * components:
 *   schemas:
 *     EvaluationRequest:
 *       type: object
 *       required:
 *         - challengeId
 *         - response
 *       properties:
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge to evaluate
 *         response:
 *           type: string
 *           description: User's response to the challenge
 *       example:
 *         challengeId: "550e8400-e29b-41d4-a716-446655440000"
 *         response: "My solution to the challenge is..."
 *     
 *     Evaluation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the evaluation
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge that was evaluated
 *         responseId:
 *           type: string
 *           description: ID of the response that was evaluated
 *         userEmail:
 *           type: string
 *           format: email
 *           description: Email of the user
 *         score:
 *           type: number
 *           description: Numerical score (0-100)
 *         scorePercentage:
 *           type: number
 *           description: Score as a percentage (0-100)
 *         feedback:
 *           type: string
 *           description: Detailed feedback on the response
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *           description: List of strengths identified in the response
 *         areas_for_improvement:
 *           type: array
 *           items:
 *             type: string
 *           description: List of areas that could be improved
 *         criteria:
 *           type: object
 *           description: Criteria-specific evaluation details
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the evaluation was created
 *         hasFeedback:
 *           type: boolean
 *           description: Whether the evaluation includes detailed feedback
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         challengeId: "550e8400-e29b-41d4-a716-446655440001"
 *         score: 85
 *         scorePercentage: 85
 *         feedback: "Good work overall. Your solution is efficient and well-structured."
 *         strengths: ["Efficient algorithm", "Clean code structure"]
 *         areas_for_improvement: ["Could improve error handling"]
 *         createdAt: "2023-06-15T14:35:42Z"
 *         hasFeedback: true
 *     
 *     StreamEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [chunk, complete, error]
 *           description: Type of stream event
 *         content:
 *           type: string
 *           description: Content chunk for chunk events
 *         evaluationId:
 *           type: string
 *           format: uuid
 *           description: ID of the completed evaluation (for complete events)
 *         score:
 *           type: number
 *           description: Score of the completed evaluation (for complete events)
 *         message:
 *           type: string
 *           description: Error message (for error events)
 *       example:
 *         type: "chunk"
 *         content: "Your solution demonstrates a good understanding of..."
 */

/**
 * Controller for handling evaluation-related HTTP requests
 */
class EvaluationController {
    /**
     * Create a new EvaluationController
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.evaluationService - Evaluation service
     * @param {Object} dependencies.openAIStateManager - OpenAI state manager
     * @param {Object} dependencies.challengeRepository - Challenge repository
     */
    constructor(dependencies = {}) {
        const { logger, evaluationService, openAIStateManager, challengeRepository } = dependencies;
        this.logger = logger;
        this.evaluationService = evaluationService;
        this.openAIStateManager = openAIStateManager;
        this.challengeRepository = challengeRepository;
        
        // Apply error handling to controller methods using standardized utility
        this.createEvaluation = withControllerErrorHandling(
            this.createEvaluation.bind(this),
            {
                methodName: 'createEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMappings: evaluationControllerErrorMappings
            }
        );
        
        this.getEvaluationById = withControllerErrorHandling(
            this.getEvaluationById.bind(this),
            {
                methodName: 'getEvaluationById',
                domainName: 'evaluation',
                logger: this.logger,
                errorMappings: evaluationControllerErrorMappings
            }
        );
        
        this.getEvaluationsForUser = withControllerErrorHandling(
            this.getEvaluationsForUser.bind(this),
            {
                methodName: 'getEvaluationsForUser',
                domainName: 'evaluation',
                logger: this.logger,
                errorMappings: evaluationControllerErrorMappings
            }
        );
        
        this.getEvaluationsForChallenge = withControllerErrorHandling(
            this.getEvaluationsForChallenge.bind(this),
            {
                methodName: 'getEvaluationsForChallenge',
                domainName: 'evaluation',
                logger: this.logger,
                errorMappings: evaluationControllerErrorMappings
            }
        );
        
        this.streamEvaluation = withControllerErrorHandling(
            this.streamEvaluation.bind(this),
            {
                methodName: 'streamEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMappings: evaluationControllerErrorMappings
            }
        );
    }

    /**
     * @swagger
     * /evaluations:
     *   post:
     *     summary: Create an evaluation for a challenge response
     *     description: Evaluates a user's response to a challenge and returns feedback and scoring
     *     operationId: createEvaluation
     *     tags: [Evaluations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EvaluationRequest'
     *     responses:
     *       201:
     *         description: Evaluation created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: success
     *                 data:
     *                   $ref: '#/components/schemas/Evaluation'
     *       400:
     *         description: Invalid request parameters
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         description: Challenge not found
     *         $ref: '#/components/responses/NotFoundError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async createEvaluation(req, res) {
        // Convert request to domain parameters
        const params = EvaluationDTOMapper.fromRequest(req.body);
        const userId = req.user.id;
        // Validate required fields
        if (!params.challengeId || !params.response) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID and user response are required'
            });
        }
        // Get challenge from repository
        const challenge = await this.challengeRepository.findById(params.challengeId);
        if (!challenge) {
            return res.status(404).json({
                status: 'error',
                message: 'Challenge not found'
            });
        }
        // Add user information to challenge object for the evaluation service
        challenge.userId = userId;
        // Create a thread ID for the evaluation
        const threadId = `eval_${params.challengeId}_${Date.now()}`;
        // Create a conversation state for this evaluation
        const _conversationState = await this.openAIStateManager.findOrCreateConversationState(userId, threadId, {
            type: 'evaluation',
            challengeId: params.challengeId,
            createdAt: new Date().toISOString()
        });
        // Generate the evaluation
        const evaluation = await this.evaluationService.evaluateResponse(challenge, params.response, { threadId });
        // Convert to DTO
        const evaluationDto = EvaluationDTOMapper.toDTO(evaluation);
        return res.status(201).json({
            status: 'success',
            data: evaluationDto
        });
    }

    /**
     * @swagger
     * /evaluations/{id}:
     *   get:
     *     summary: Get an evaluation by ID
     *     description: Retrieves a specific evaluation by its unique ID
     *     operationId: getEvaluationById
     *     tags: [Evaluations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: ID of the evaluation to retrieve
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Evaluation retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: success
     *                 data:
     *                   $ref: '#/components/schemas/Evaluation'
     *       404:
     *         description: Evaluation not found
     *         $ref: '#/components/responses/NotFoundError'
     *       403:
     *         description: Not authorized to access this evaluation
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: error
     *                 message:
     *                   type: string
     *                   example: Not authorized to access this evaluation
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async getEvaluationById(req, res) {
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
        // Convert to DTO
        const evaluationDto = EvaluationDTOMapper.toDTO(evaluation);
        return res.status(200).json({
            status: 'success',
            data: evaluationDto
        });
    }

    /**
     * @swagger
     * /users/{userId}/evaluations:
     *   get:
     *     summary: Get all evaluations for a user
     *     description: Retrieves all evaluations associated with a specific user
     *     operationId: getEvaluationsForUser
     *     tags: [Evaluations, Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: userId
     *         in: path
     *         required: true
     *         description: ID of the user to get evaluations for
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Evaluations retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: success
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Evaluation'
     *       403:
     *         description: Not authorized to access these evaluations
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: error
     *                 message:
     *                   type: string
     *                   example: Not authorized to access these evaluations
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async getEvaluationsForUser(req, res) {
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
        // Convert to DTOs
        const evaluationDtos = EvaluationDTOMapper.toDTOCollection(evaluations);
        return res.status(200).json({
            status: 'success',
            data: evaluationDtos
        });
    }

    /**
     * @swagger
     * /challenges/{challengeId}/evaluations:
     *   get:
     *     summary: Get evaluations for a specific challenge
     *     description: Retrieves all evaluations associated with a specific challenge for the current user
     *     operationId: getEvaluationsForChallenge
     *     tags: [Evaluations, Challenges]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: challengeId
     *         in: path
     *         required: true
     *         description: ID of the challenge to get evaluations for
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Evaluations retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: success
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Evaluation'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async getEvaluationsForChallenge(req, res) {
        const { challengeId } = req.params;
        const userId = req.user.id;
        // Get evaluations from repository
        const evaluations = await this.evaluationService.getEvaluationsForChallenge(challengeId, userId);
        // Convert to DTOs
        const evaluationDtos = EvaluationDTOMapper.toDTOCollection(evaluations);
        return res.status(200).json({
            status: 'success',
            data: evaluationDtos
        });
    }

    /**
     * @swagger
     * /evaluations/stream:
     *   post:
     *     summary: Stream an evaluation response in real-time
     *     description: Streams the evaluation of a challenge response as server-sent events
     *     operationId: streamEvaluation
     *     tags: [Evaluations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EvaluationRequest'
     *     responses:
     *       200:
     *         description: Server-sent event stream started
     *         content:
     *           text/event-stream:
     *             schema:
     *               type: object
     *               properties:
     *                 type:
     *                   type: string
     *                   enum: [chunk, complete, error]
     *                 content:
     *                   type: string
     *       400:
     *         description: Invalid request parameters
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         description: Challenge not found
     *         $ref: '#/components/responses/NotFoundError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async streamEvaluation(req, res) {
        // Convert request to domain parameters
        const params = EvaluationDTOMapper.fromRequest(req.body);
        const userId = req.user.id;
        // Validate required fields
        if (!params.challengeId || !params.response) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID and user response are required'
            });
        }
        // Get challenge from repository
        const challenge = await this.challengeRepository.findById(params.challengeId);
        if (!challenge) {
            return res.status(404).json({
                status: 'error',
                message: 'Challenge not found'
            });
        }
        // Add user information to challenge object for the evaluation service
        challenge.userId = userId;
        // Create a thread ID for the evaluation
        const threadId = `eval_stream_${params.challengeId}_${Date.now()}`;
        // Create a conversation state for this evaluation
        await this.openAIStateManager.findOrCreateConversationState(userId, threadId, {
            type: 'evaluation_stream',
            challengeId: params.challengeId,
            createdAt: new Date().toISOString()
        });
        // Set up server-sent events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Stream the evaluation
        let _fullText = '';
        let completed = false;
        try {
            await this.evaluationService.streamEvaluation(challenge, params.response, {
                onChunk: chunk => {
                    _fullText += chunk;
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
                },
                onComplete: async (text) => {
                    completed = true;
                    // Process the evaluation
                    const evaluation = await this.evaluationService.processStreamedEvaluation(userId, params.challengeId, text, threadId);
                    // Convert to DTO (for consistency)
                    const evaluationDto = EvaluationDTOMapper.toDTO(evaluation);
                    // Send the completed message with evaluation ID
                    res.write(`data: ${JSON.stringify({
                        type: 'complete',
                        evaluationId: evaluationDto.id,
                        score: evaluationDto.score,
                        scorePercentage: evaluationDto.scorePercentage,
                        hasFeedback: evaluationDto.hasFeedback
                    })}\n\n`);
                    res.end();
                },
                onError: error => {
                    if (!completed) {
                        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
                        res.end();
                    }
                }
            }, { threadId });
        }
        catch (error) {
            if (!completed) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
                res.end();
            }
        }
    }
}
export default EvaluationController;
