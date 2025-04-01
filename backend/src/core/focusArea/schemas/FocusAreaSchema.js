/**
 * @swagger
 * components:
 *   schemas:
 *     FocusArea:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the focus area
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user this focus area belongs to
 *         name:
 *           type: string
 *           description: Name/title of the focus area
 *         description:
 *           type: string
 *           description: Detailed description of the focus area
 *         active:
 *           type: boolean
 *           description: Whether this focus area is active
 *         priority:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Priority level (1-5, where 1 is highest)
 *         metadata:
 *           type: object
 *           description: Additional metadata about the focus area
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the focus area was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the focus area was last updated
 *     
 *     FocusAreaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/FocusArea'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/FocusArea'
 */

// Schema file for FocusArea model documentation
'use strict';

export default {}; 