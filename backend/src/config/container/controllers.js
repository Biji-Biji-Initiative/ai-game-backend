import UserController from "#app/core/user/controllers/UserController.js";
import PersonalityController from "#app/core/personality/controllers/PersonalityController.js";
import ProgressController from "#app/core/progress/controllers/ProgressController.js";
import AdaptiveController from "#app/core/adaptive/controllers/AdaptiveController.js";
import AuthController from "#app/core/auth/controllers/AuthController.js";
import ChallengeController from "#app/core/challenge/controllers/ChallengeController.js";
import EvaluationController from "#app/core/evaluation/controllers/EvaluationController.js";
import FocusAreaController from "#app/core/focusArea/controllers/FocusAreaController.js";
import UserJourneyController from "#app/core/userJourney/controllers/UserJourneyController.js";
import HealthCheckController from "#app/core/infra/health/HealthCheckController.js";
// Note: AiChatController and AiAnalysisController are not yet implemented
// These imports will be added once the controllers are created
// import AiChatController from "../../controllers/ai/AiChatController.js";
// import AiAnalysisController from "../../controllers/ai/AiAnalysisController.js";
// import EventBusController from "..."; // Assuming a path if it existed
'use strict';
/**
 * Controller Components Registration
 *
 * This module registers all controller components in the DI container.
 * Controllers are stateless components that handle HTTP requests and responses.
 * They delegate business logic to services and coordinators.
 *
 * All controllers are registered as singletons because:
 * 1. They are stateless - they don't maintain request-specific data
 * 2. They are lightweight - they only delegate to services/coordinators
 * 3. They improve performance - no need to instantiate for each request
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
            userRepository: c.get('userRepository'),
            focusAreaCoordinator: c.get('focusAreaCoordinator'),
            userPreferencesManager: c.get('userPreferencesManager'),
            logger: c.get('userLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    // Register auth controller
    container.register('authController', c => {
        return new AuthController({
            userRepository: c.get('userRepository'),
            supabase: c.get('supabase'),
            logger: c.get('userLogger'), // Auth is related to user management
        });
    }, true // Singleton: YES - stateless controller
    );

    container.register('personalityController', c => {
        return new PersonalityController({
            personalityService: c.get('personalityService'),
            logger: c.get('personalityLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    // Use ProgressController directly
    container.register('progressController', c => {
        return new ProgressController({
            progressService: c.get('progressService'),
            logger: c.get('progressLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    
    container.register('adaptiveController', c => {
        return new AdaptiveController({
            adaptiveService: c.get('adaptiveService'),
            logger: c.get('adaptiveLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    container.register('focusAreaController', c => {
        return new FocusAreaController({
            focusAreaCoordinator: c.get('focusAreaCoordinator'),
            logger: c.get('focusAreaLogger'),
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
            logger: c.get('userJourneyLogger'),
        });
    }, true // Singleton: YES - stateless controller
    );
    // AI-related controllers
    // container.register('aiChatController', c => {
    //     return new AiChatController({
    //         aiChatService: c.get('aiChatService'),
    //         logger: c.get('apiLogger'),
    //     });
    // }, true // Singleton: YES - stateless controller
    // );
    // container.register('aiAnalysisController', c => {
    //     return new AiAnalysisController({
    //         aiAnalysisService: c.get('aiAnalysisService'),
    //         logger: c.get('apiLogger'),
    //     });
    // }, true // Singleton: YES - stateless controller
    // );
    // Register health check controller
    container.register('healthCheckController', c => {
        return new HealthCheckController({
            healthCheckService: c.get('healthCheckService'),
            logger: c.get('infraLogger')
        });
    }, true // Singleton: YES - stateless controller
    );

    // Placeholder for EventBusController
    container.register('eventBusController', c => {
        console.warn('[DI] Registering MOCK eventBusController');
        // Return a mock object that satisfies RouteFactory's check
        return {
             handleEvent: async (req, res) => {
                 res.status(501).json({ message: 'Event bus endpoint not implemented' });
             }
             // Add other methods if RouteFactory expects them
        };
    }, true); // Singleton
}
export { registerControllerComponents };
export default {
    registerControllerComponents
};
