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
import SystemController from "#app/core/system/controllers/SystemController.js";
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
    const controllerLogger = container.get('logger').child({ context: 'DI-Controllers' });
    controllerLogger.info('[DI Controllers] Starting controller registration...');

    // Register domain controllers using the custom DIContainer format
    // Controllers are typically singletons as they are stateless

    controllerLogger.info('[DI Controllers] Registering userController...');
    container.register('userController', c => new UserController({
            userService: c.get('userService'),
            userRepository: c.get('userRepository'),
            focusAreaCoordinator: c.get('focusAreaManagementCoordinator'),
            userPreferencesManager: c.get('userPreferencesManager'),
        logger: c.get('userLogger')
    }), true);
    
    controllerLogger.info('[DI Controllers] Registering authController...');
    container.register('authController', c => new AuthController({
            userRepository: c.get('userRepository'),
            supabase: c.get('db'),
        logger: c.get('userLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering personalityController...');
    container.register('personalityController', c => new PersonalityController({
            personalityService: c.get('personalityService'),
        logger: c.get('personalityLogger')
    }), true);
    
    controllerLogger.info('[DI Controllers] Registering progressController...');
    container.register('progressController', c => new ProgressController({
            progressService: c.get('progressService'),
        logger: c.get('progressLogger')
    }), true);
    
    controllerLogger.info('[DI Controllers] Registering adaptiveController...');
    container.register('adaptiveController', c => new AdaptiveController({
            adaptiveService: c.get('adaptiveService'),
        logger: c.get('adaptiveLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering focusAreaController...');
    container.register('focusAreaController', c => new FocusAreaController({
            focusAreaManagementCoordinator: c.get('focusAreaManagementCoordinator'),
            focusAreaGenerationCoordinator: c.get('focusAreaGenerationCoordinator'),
        logger: c.get('focusAreaLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering challengeController...');
    container.register('challengeController', c => new ChallengeController({
            challengeCoordinator: c.get('challengeCoordinator'),
            progressCoordinator: c.get('progressCoordinator'),
        logger: c.get('challengeLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering evaluationController...');
    container.register('evaluationController', c => new EvaluationController({
            evaluationService: c.get('evaluationService'),
        logger: c.get('evaluationLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering userJourneyController...');
    container.register('userJourneyController', c => new UserJourneyController({
            userJourneyCoordinator: c.get('userJourneyCoordinator'),
            userService: c.get('userService'),
            logger: c.get('userJourneyLogger')
    }), true);

    controllerLogger.info('[DI Controllers] Registering healthCheckController...');
    container.register('healthCheckController', c => new HealthCheckController({
            healthCheckService: c.get('healthCheckService'),
            logger: c.get('infraLogger')
    }), true);

    // Add registration for SystemController
    controllerLogger.info('[DI Controllers] Registering systemController...');
    container.register('systemController', c => {
        return new SystemController({
            logService: c.get('logService'), // Assuming logService is registered
            logger: c.get('infraLogger').child({ component: 'SystemController' })
        });
    }, true);

    // Placeholder for EventBusController
    controllerLogger.info('[DI Controllers] Registering eventBusController (Mock)...');
    container.register('eventBusController', c => {
        controllerLogger.warn('[DI Controllers] Registering MOCK eventBusController');
        return { handleEvent: async (req, res) => { res.status(501).json({ message: 'Event bus endpoint not implemented' }); } };
    }, true); 
    
    controllerLogger.info('[DI Controllers] Controller registration complete.');
}

export { registerControllerComponents };
export default {
    registerControllerComponents
};
