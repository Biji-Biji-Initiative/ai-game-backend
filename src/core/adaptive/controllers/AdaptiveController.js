import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { AdaptiveError, AdaptiveValidationError, AdaptiveNotFoundError } from "../errors/adaptiveErrors.js";
import { AuthError } from "../../auth/errors/AuthErrors.js";
'use strict';
// Define error mappings for controllers
const errorMappings = [
    { errorClass: AdaptiveNotFoundError, statusCode: 404 },
    { errorClass: AdaptiveValidationError, statusCode: 400 },
    { errorClass: AdaptiveError, statusCode: 500 },
    { errorClass: AuthError, statusCode: 401 }
];

/**
 * @swagger
 * components:
 *   schemas:
 *     RecommendationResponse:
 *       type: object
 *       properties:
 *         recommendedFocusAreas:
 *           type: array
 *           items:
 *             type: string
 *           description: Focus areas recommended for the user based on their profile
 *         recommendedChallengeTypes:
 *           type: array
 *           items:
 *             type: string
 *           description: Challenge types recommended for the user
 *         suggestedLearningResources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *           description: Learning resources that may help the user improve
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *           description: User's strengths based on past performance
 *         weaknesses:
 *           type: array
 *           items:
 *             type: string
 *           description: Areas where the user could improve
 *       example:
 *         recommendedFocusAreas: ["algorithms", "data-structures"]
 *         recommendedChallengeTypes: ["implementation", "debugging"]
 *         suggestedLearningResources: [
 *           { title: "Algorithm Design Manual", url: "https://example.com/alg", type: "book" }
 *         ]
 *         strengths: ["Problem decomposition", "Efficiency optimization"]
 *         weaknesses: ["Error handling", "Edge case identification"]
 *     
 *     DynamicChallengeParams:
 *       type: object
 *       properties:
 *         challengeType:
 *           type: string
 *           description: Type of challenge to generate
 *         focusArea:
 *           type: string
 *           description: Focus area for the challenge
 *         difficulty:
 *           type: number
 *           description: Difficulty level from 1-100
 *         parameters:
 *           type: object
 *           description: Additional parameters for challenge generation
 *       example:
 *         challengeType: "implementation"
 *         focusArea: "algorithms"
 *         difficulty: 75
 *         parameters: { timeLimit: 2700, prohibitedApis: ["ai-assistant"] }
 *     
 *     DifficultySettings:
 *       type: object
 *       properties:
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           description: Difficulty level label
 *         score:
 *           type: number
 *           description: Numerical difficulty score (0-100)
 *         timeLimit:
 *           type: number
 *           description: Suggested time limit in seconds
 *         hintCount:
 *           type: integer
 *           description: Number of hints available
 *       example:
 *         level: "intermediate"
 *         score: 65
 *         timeLimit: 1800
 *         hintCount: 2
 */

/**
 * Adaptive Controller
 *
 * Handles HTTP requests related to adaptive learning operations.
 */
/**
 *
 */
class AdaptiveController {
    /**
     * Create a new AdaptiveController
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.adaptiveService - Adaptive service
     */
    /**
     * Method constructor
     */
    constructor(dependencies = {}) {
        const { logger, adaptiveService } = dependencies;
        this.logger = logger;
        this.adaptiveService = adaptiveService;
        
        // Apply standardized error handling to controller methods
        this.getRecommendations = withControllerErrorHandling(
            this.getRecommendations.bind(this),
            {
                methodName: 'getRecommendations',
                domainName: 'adaptive',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.generateChallenge = withControllerErrorHandling(
            this.generateChallenge.bind(this),
            {
                methodName: 'generateChallenge',
                domainName: 'adaptive',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.adjustDifficulty = withControllerErrorHandling(
            this.adjustDifficulty.bind(this),
            {
                methodName: 'adjustDifficulty',
                domainName: 'adaptive',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.calculateDifficulty = withControllerErrorHandling(
            this.calculateDifficulty.bind(this),
            {
                methodName: 'calculateDifficulty',
                domainName: 'adaptive',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
    }

    /**
     * @swagger
     * /adaptive/recommendations:
     *   get:
     *     summary: Get personalized recommendations
     *     description: Provides personalized recommendations for the current user based on their profile and progress
     *     operationId: getAdaptiveRecommendations
     *     tags: [Adaptive]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Recommendations successfully generated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 recommendedFocusAreas:
     *                   type: array
     *                   items:
     *                     type: string
     *                 recommendedChallengeTypes:
     *                   type: array
     *                   items:
     *                     type: string
     *                 suggestedLearningResources:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       title:
     *                         type: string
     *                       url:
     *                         type: string
     *                       type:
     *                         type: string
     *                 strengths:
     *                   type: array
     *                   items:
     *                     type: string
     *                 weaknesses:
     *                   type: array
     *                   items:
     *                     type: string
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         description: Server error
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
     */
    async getRecommendations(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            throw new AuthError('Unauthorized', 401);
        }
        // Get recommendations
        const recommendations = await this.adaptiveService.getLatestRecommendations(req.user.id);
        // Return recommendations
        return res.success({
            recommendedFocusAreas: recommendations.recommendedFocusAreas,
            recommendedChallengeTypes: recommendations.recommendedChallengeTypes,
            suggestedLearningResources: recommendations.suggestedLearningResources,
            strengths: recommendations.strengths,
            weaknesses: recommendations.weaknesses
        });
    }

    /**
     * @swagger
     * /adaptive/challenges:
     *   get:
     *     summary: Generate a dynamic challenge
     *     description: Dynamically generates a challenge tailored to the user's ability level and learning needs
     *     operationId: generateDynamicChallenge
     *     tags: [Adaptive, Challenges]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: focusArea
     *         in: query
     *         description: Focus area to generate a challenge for
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Challenge parameters generated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/DynamicChallengeParams'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       400:
     *         description: Invalid request
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
     */
    async generateChallenge(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            throw new AuthError('Unauthorized', 401);
        }
        const { focusArea } = req.query;
        // Generate challenge
        const challengeParams = await this.adaptiveService.generateDynamicChallenge(req.user.id, focusArea || null);
        // Return challenge parameters
        return res.success(challengeParams);
    }

    /**
     * @swagger
     * /adaptive/difficulty/adjust:
     *   post:
     *     summary: Adjust difficulty based on user performance
     *     description: Adjusts the difficulty level for future challenges based on user's performance
     *     operationId: adjustDifficulty
     *     tags: [Adaptive]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - challengeId
     *               - score
     *             properties:
     *               challengeId:
     *                 type: string
     *                 format: uuid
     *                 description: ID of the completed challenge
     *               score:
     *                 type: number
     *                 minimum: 0
     *                 maximum: 100
     *                 description: User's score on the challenge (0-100)
     *     responses:
     *       200:
     *         description: Difficulty adjusted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 difficulty:
     *                   $ref: '#/components/schemas/DifficultySettings'
     *       400:
     *         description: Invalid request parameters
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async adjustDifficulty(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            throw new AuthError('Unauthorized', 401);
        }
        const { challengeId, score } = req.body;
        // Basic validation
        if (!challengeId) {
            throw new AdaptiveValidationError('Challenge ID is required');
        }
        if (isNaN(score) || score < 0 || score > 100) {
            throw new AdaptiveValidationError('Score must be a number between 0 and 100');
        }
        // Adjust difficulty
        const difficulty = await this.adaptiveService.adjustDifficulty(req.user.id, challengeId, score);
        // Return adjusted difficulty
        return res.success({ difficulty: difficulty.toSettings() });
    }

    /**
     * @swagger
     * /adaptive/difficulty:
     *   get:
     *     summary: Calculate optimal difficulty for a user
     *     description: Calculates the optimal difficulty level for a user based on their performance history
     *     operationId: calculateOptimalDifficulty
     *     tags: [Adaptive]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: challengeType
     *         in: query
     *         description: Type of challenge to calculate difficulty for
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Difficulty calculated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 difficulty:
     *                   $ref: '#/components/schemas/DifficultySettings'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async calculateDifficulty(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            throw new AuthError('Unauthorized', 401);
        }
        const { challengeType } = req.query;
        // Calculate difficulty
        const difficulty = await this.adaptiveService.calculateOptimalDifficulty(req.user.id, challengeType || null);
        // Return difficulty settings
        return res.success({ difficulty: difficulty.toSettings() });
    }
}
export default AdaptiveController;
