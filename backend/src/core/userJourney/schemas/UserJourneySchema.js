/**
 * @swagger
 * components:
 *   schemas:
 *     UserJourneyEvent:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - eventType
 *         - timestamp
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the user journey event
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user this event belongs to
 *         eventType:
 *           type: string
 *           enum: [CHALLENGE_COMPLETED, FOCUS_AREA_SELECTED, SKILL_LEVEL_INCREASED, ACHIEVEMENT_EARNED, LOGIN, REGISTRATION, PROFILE_UPDATED]
 *           description: Type of user journey event
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When this event occurred
 *         data:
 *           type: object
 *           description: Additional data related to the event
 *           properties:
 *             challengeId:
 *               type: string
 *               format: uuid
 *               description: ID of the related challenge (for challenge events)
 *             focusAreaId:
 *               type: string
 *               format: uuid
 *               description: ID of the related focus area (for focus area events)
 *             achievementId:
 *               type: string
 *               format: uuid
 *               description: ID of the achievement (for achievement events)
 *             skillName:
 *               type: string
 *               description: Name of the skill (for skill events)
 *             previousLevel:
 *               type: number
 *               description: Previous skill level (for skill events)
 *             newLevel:
 *               type: number
 *               description: New skill level (for skill events)
 *         metadata:
 *           type: object
 *           description: Additional metadata about the event
 *     
 *     UserJourneyResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/UserJourneyEvent'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/UserJourneyEvent'
 */

// Schema file for UserJourney model documentation
'use strict';

export default {}; 