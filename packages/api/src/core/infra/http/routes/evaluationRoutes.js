"../../../evaluation/controllers/EvaluationController.js;
""../../../infra/http/middleware/auth.js82;
'use strict';

/**
 * Evaluation Routes
 * Handles routes related to evaluation and feedback
 */
const router = express.Router();

/**
 * Evaluation routes factory
 * @param {EvaluationController} evaluationController - Evaluation controller instance
 * @returns {express.Router} Express router
 */
export default function evaluationRoutes(evaluationController) {
    // Submit a new evaluation
    router.post('/', authenticateUser, (req, res) => evaluationController.createEvaluation(req, res));
    
    // Stream an evaluation
    router.post('/stream', authenticateUser, (req, res) => evaluationController.streamEvaluation(req, res));
    
    // Get evaluations for a challenge - specific route before parameterized routes
    router.get('/challenge/:challengeId', authenticateUser, (req, res) => evaluationController.getEvaluationsForChallenge(req, res));
    
    // Get evaluations for current user - specific route before parameterized routes
    router.get('/user/me', authenticateUser, (req, res) => evaluationController.getEvaluationsForUser(req, res));
    
    // Get an evaluation by ID - parameterized route last to avoid conflicts
    router.get('/:id', authenticateUser, (req, res) => evaluationController.getEvaluationById(req, res));
    
    return router;
}
"