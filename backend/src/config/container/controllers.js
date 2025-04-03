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
import AdminController from "#app/core/admin/controllers/AdminController.js";
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
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerControllerComponents(container, logger) {
    // Use passed-in logger or fallback
    const controllerLogger = logger || container.get('logger').child({ context: 'DI-Controllers' });
    controllerLogger.info('Starting controller registration...');

    // User Domain
    controllerLogger.info('Registering userController...');
    container.register('userController', c => new UserController({
        userService: c.get('userService'),
        userRepository: c.get('userRepository'), // Inject repository directly if needed for email lookup etc.
        focusAreaCoordinator: c.get('focusAreaManagementCoordinator'),
        userPreferencesManager: c.get('userPreferencesManager'),
        logger: c.get('userLogger')
    }), true); // Singleton

    // Auth Domain
    controllerLogger.info('Registering authController...');
    container.register('authController', c => new AuthController({
        userRepository: c.get('userRepository'), // Assuming AuthController interacts with repo directly for auth
        supabase: c.get('db'),
        logger: c.get('userLogger'), // Use user logger for auth context
        emailService: c.get('emailService'), // Add email service for verification
        authService: c.get('authService') // Add authService for token management
    }), true); // Singleton
    
    // Personality Domain
    controllerLogger.info('Registering personalityController...');
    container.register('personalityController', c => new PersonalityController({
        personalityService: c.get('personalityService'),
        logger: c.get('personalityLogger')
    }), true); // Singleton

    // Progress Domain
    controllerLogger.info('Registering progressController...');
    container.register('progressController', c => new ProgressController({
        progressService: c.get('progressService'),
        logger: c.get('progressLogger')
    }), true); // Singleton
    
    // Adaptive Domain
    controllerLogger.info('Registering adaptiveController...');
    container.register('adaptiveController', c => new AdaptiveController({
        adaptiveService: c.get('adaptiveService'),
        logger: c.get('adaptiveLogger')
    }), true); // Singleton

    // Focus Area Domain
    controllerLogger.info('Registering focusAreaController...');
    container.register('focusAreaController', c => new FocusAreaController({
        // Inject coordinators for managing different focus area aspects
        focusAreaManagementCoordinator: c.get('focusAreaManagementCoordinator'),
        focusAreaGenerationCoordinator: c.get('focusAreaGenerationCoordinator'),
        logger: c.get('focusAreaLogger')
    }), true); // Singleton

    // Challenge Domain
    controllerLogger.info('Registering challengeController...');
    container.register('challengeController', c => new ChallengeController({
        challengeCoordinator: c.get('challengeCoordinator'),
        progressCoordinator: c.get('progressCoordinator'), // Added for submitting answers
        logger: c.get('challengeLogger')
    }), true); // Singleton

    // Evaluation Domain
    controllerLogger.info('Registering evaluationController...');
    container.register('evaluationController', c => new EvaluationController({
        evaluationService: c.get('evaluationService'),
        logger: c.get('evaluationLogger')
    }), true); // Singleton
    
    // User Journey Domain
    controllerLogger.info('Registering userJourneyController...');
    container.register('userJourneyController', c => new UserJourneyController({
        userJourneyCoordinator: c.get('userJourneyCoordinator'),
        userService: c.get('userService'), // Add userService here
        logger: c.get('userJourneyLogger')
    }), true); // Singleton

    // System / Infrastructure Controllers
    controllerLogger.info('Registering healthCheckController...');
    container.register('healthCheckController', c => new HealthCheckController({
        healthCheckService: c.get('healthCheckService'),
        logger: c.get('infraLogger')
    }), true); // Singleton

    controllerLogger.info('Registering systemController...');
    container.register('systemController', c => new SystemController({
        logService: c.get('logService'),
        logger: c.get('infraLogger')
    }), true); // Singleton
    
    controllerLogger.info('Registering eventBusController (Mock)...');
    // Register MOCK event bus controller (if it exists and is needed)
    if (typeof EventBusController !== 'undefined') {
        controllerLogger.info('Registering MOCK eventBusController');
        container.register('eventBusController', c => new EventBusController(c.get('systemController')), true);
    } else {
        controllerLogger.warn('EventBusController class not found, skipping registration.');
    }

    // Admin Controller
    controllerLogger.info('Registering adminController...');
    container.register('adminController', c => new AdminController({
        adminService: c.get('adminService'),
        logger: c.get('infraLogger')
    }), true); // Singleton

    controllerLogger.info('Controller registration complete.');
}

export { registerControllerComponents };
export default {
    registerControllerComponents
};
