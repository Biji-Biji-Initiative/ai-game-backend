"../../../challenge/controllers/ChallengeController.js;
""../../../infra/http/middleware/auth.js80;
'use strict';

/**
 * Challenge Routes
 * Handles routes related to challenges and exercises
 */
const router = express.Router();

/**
 * Challenge routes factory
 * @param {ChallengeController} challengeController - Challenge controller instance
 * @returns {express.Router} Express router
 */
export default function challengeRoutes(challengeController) {
    // Get all challenges
    router.get('/', authenticateUser, (req, res) => challengeController.getAllChallenges(req, res));
    
    // Get a specific challenge
    router.get('/:id', authenticateUser, (req, res) => challengeController.getChallenge(req, res));
    
    // Create a new challenge
    router.post('/', authenticateUser, (req, res) => challengeController.createChallenge(req, res));
    
    // Submit challenge response
    router.post('/:id/responses', authenticateUser, (req, res) => challengeController.submitChallengeResponse(req, res));
    
    // Get challenge types
    router.get('/types', authenticateUser, (req, res) => challengeController.getChallengeTypes(req, res));
    
    // Generate a personalized challenge
    router.post('/generate', authenticateUser, (req, res) => challengeController.generateChallenge(req, res));
    
    return router;
}
"