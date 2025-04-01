/**
 * @swagger
 * components:
 *   schemas:
 *     Progress:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the progress record
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user this progress belongs to
 *         focusArea:
 *           type: string
 *           description: Primary focus area for this progress record
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the last challenge completed
 *         score:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Score for the last challenge (0-100)
 *         completionTime:
 *           type: number
 *           description: Time taken to complete the last challenge in seconds
 *         skillLevels:
 *           type: object
 *           description: Map of skills to proficiency levels (0-100)
 *           additionalProperties:
 *             type: number
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *           description: User's identified strengths
 *         weaknesses:
 *           type: array
 *           items:
 *             type: string
 *           description: User's identified areas for improvement
 *         completedChallenges:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               score:
 *                 type: number
 *               completionTime:
 *                 type: number
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *           description: List of completed challenges
 *         statistics:
 *           type: object
 *           properties:
 *             totalChallenges:
 *               type: integer
 *               description: Total number of challenges completed
 *             averageScore:
 *               type: number
 *               description: Average score across all challenges
 *             highestScore:
 *               type: number
 *               description: Highest score achieved
 *             averageCompletionTime:
 *               type: number
 *               description: Average completion time across all challenges
 *             streakDays:
 *               type: integer
 *               description: Number of consecutive days with activity
 *             lastActive:
 *               type: string
 *               format: date-time
 *               description: Timestamp of last activity
 *           description: Aggregated statistics about user progress
 *         status:
 *           type: string
 *           enum: [active, inactive, completed]
 *           description: Current status of this progress record
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the progress record was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the progress record was last updated
 *     
 *     ProgressResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Progress'
 */

// Schema file for Progress model documentation
'use strict';

export default {}; 