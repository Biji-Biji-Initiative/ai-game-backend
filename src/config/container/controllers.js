import UserController from "../../core/user/controllers/UserController.js";
import PersonalityController from "../../core/personality/controllers/PersonalityController.js";
import ProgressController from "../../core/progress/controllers/ProgressController.js";
import AdaptiveController from "../../core/adaptive/controllers/AdaptiveController.js";
import AuthController from "../../core/auth/controllers/AuthController.js";
import ChallengeController from "../../core/challenge/controllers/ChallengeController.js";
import EvaluationController from "../../core/evaluation/controllers/EvaluationController.js";
import FocusAreaController from "../../core/focusArea/controllers/FocusAreaController.js";
import UserJourneyController from "../../core/userJourney/controllers/UserJourneyController.js";
import HealthCheckController from "../../core/infra/health/HealthCheckController.js";
// Note: AiChatController and AiAnalysisController are not yet implemented
// These imports will be added once the controllers are created
// import AiChatController from "../../controllers/ai/AiChatController.js";
// import AiAnalysisController from "../../controllers/ai/AiAnalysisController.js";
'use strict';
/**
 * Controller Components Registration
 *
 * This module registers all controller components in the DI container.
 * Controllers are stateless components that handle HTTP requests and responses.
 * They delegate business logic to services and coordinators.
 *
 * All controllers are registered as singletons because:
 * 1. They are stateless - they don't maintain request-specific data between calls
 * 2. They are thread-safe - they don't have mutable instance variables
 * 3. They are lightweight - they only delegate to services/coordinators
 * 4. They improve performance - no need to instantiate for each request
 * 5. They have no security implications - they don't store user-specific state
 */
/**
 * Register controller components in the container
 * @param {DIContainer} container - The DI container
 */
function registerControllerComponents(container) {
    // Register domain controllers
    container.register('userController', c => {
        return new UserController({
            userService: c.get('userService'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    // Register auth controller
    container.register('authController', c => {
        return new AuthController({
            userRepository: c.get('userRepository'),
            supabase: c.get('supabase'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );

    container.register('personalityController', c => {
        return new PersonalityController({
            personalityService: c.get('personalityService'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    // Use ProgressController directly
    container.register('progressController', c => {
        return new ProgressController({
            progressService: c.get('progressService'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    container.register('adaptiveController', c => {
        return new AdaptiveController({
            adaptiveService: c.get('adaptiveService'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    container.register('focusAreaController', c => {
        return new FocusAreaController({
            focusAreaCoordinator: c.get('focusAreaCoordinator'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    container.register('challengeController', c => {
        return new ChallengeController({
            challengeService: c.get('challengeService'),
            logger: c.get('challengeLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    container.register('evaluationController', c => {
        return new EvaluationController({
            evaluationService: c.get('evaluationService'),
            logger: c.get('evaluationLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    container.register('userJourneyController', c => {
        return new UserJourneyController({
            userJourneyService: c.get('userJourneyService'),
            logger: c.get('logger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    // AI-related controllers
    // container.register('aiChatController', c => {
    //     return new AiChatController({
    //         aiChatService: c.get('aiChatService'),
    //         logger: c.get('logger'),
    //     });
    // }, true // Singleton: YES - stateless controller
    // );
    // container.register('aiAnalysisController', c => {
    //     return new AiAnalysisController({
    //         aiAnalysisService: c.get('aiAnalysisService'),
    //         logger: c.get('logger'),
    //     });
    // }, true // Singleton: YES - stateless controller
    // );
    // Register health check controller
    container.register('healthCheckController', c => {
        return new HealthCheckController({
            healthCheckService: c.get('healthCheckService'),
            logger: c.get('logger')
        });
    }, true // Singleton: YES - stateless controller
    );
}
export { registerControllerComponents };
export default {
    registerControllerComponents
};
