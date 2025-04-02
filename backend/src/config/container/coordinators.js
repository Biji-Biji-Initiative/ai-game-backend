import PersonalityCoordinator from "#app/application/PersonalityCoordinator.js";
// import FocusAreaCoordinatorFacade from "#app/application/focusArea/FocusAreaCoordinatorFacade.js"; // REMOVED - Refactored
import ChallengeCoordinator from "#app/application/challengeCoordinator.js";
import UserJourneyCoordinator from "#app/application/userJourneyCoordinator.js";
import FocusAreaGenerationCoordinator from "#app/application/focusArea/FocusAreaGenerationCoordinator.js";
import FocusAreaManagementCoordinator from "#app/application/focusArea/FocusAreaManagementCoordinator.js";
import ProgressCoordinator from "#app/application/progress/ProgressCoordinator.js";
import ApplicationEventHandlers from "#app/application/EventHandlers.js";
'use strict';
/**
 * Coordinator Components Registration
 *
 * This module registers all coordinator components in the DI container.
 * Coordinators are application-level services that orchestrate multiple domain services.
 * Most coordinators should be transient as they handle individual user requests and
 * may store request-specific state during complex operations.
 */
/**
 * Register coordinator components in the container
 * @param {DIContainer} container - The DI container
 */
function registerCoordinatorComponents(container) {
    const coordinatorLogger = container.get('logger').child({ context: 'DI-Coordinators' });
    coordinatorLogger.info('[DI Coordinators] Starting coordinator registration...');

    coordinatorLogger.info('[DI Coordinators] Registering personalityCoordinator...');
    container.register('personalityCoordinator', c => {
        return new PersonalityCoordinator({
            userService: c.get('userService'),
            personalityService: c.get('personalityService'),
            personalityDataLoader: c.get('personalityDataLoader'),
            logger: c.get('personalityLogger')
        });
    }, false // Transient: orchestrates user-specific personality operations
    );
    coordinatorLogger.info('[DI Coordinators] Registering challengeCoordinator...');
    container.register('challengeCoordinator', c => {
        return new ChallengeCoordinator({
            userService: c.get('userService'),
            challengeService: c.get('challengeService'),
            challengeConfigService: c.get('challengeConfigService'),
            challengeFactory: c.get('challengeFactory'),
            challengeGenerationService: c.get('challengeGenerationService'),
            challengeEvaluationService: c.get('challengeEvaluationService'),
            logger: c.get('challengeLogger'),
        });
    }, false // Transient: manages user-specific challenge operations
    );
    coordinatorLogger.info('[DI Coordinators] Registering userJourneyCoordinator...');
    container.register('userJourneyCoordinator', c => {
        return new UserJourneyCoordinator({
            userJourneyRepository: c.get('userJourneyRepository'),
            userRepository: c.get('userRepository'),
            logger: c.get('userJourneyLogger'),
        });
    }, false // Transient: handles user-specific journey progress
    );
    // Register more specialized focus area coordinators
    coordinatorLogger.info('[DI Coordinators] Registering focusAreaGenerationCoordinator...');
    container.register('focusAreaGenerationCoordinator', c => {
        return new FocusAreaGenerationCoordinator({
            userService: c.get('userService'),
            challengeService: c.get('challengeService'),
            progressService: c.get('progressService'),
            focusAreaService: c.get('focusAreaService'),
            focusAreaThreadService: c.get('focusAreaThreadService'),
            focusAreaGenerationService: c.get('focusAreaGenerationService'),
            eventBus: c.get('eventBus'),
            eventTypes: c.get('eventTypes'),
            logger: c.get('focusAreaLogger'),
        });
    }, false // Transient: generates user-specific focus areas
    );
    coordinatorLogger.info('[DI Coordinators] Registering focusAreaManagementCoordinator...');
    container.register('focusAreaManagementCoordinator', c => {
        return new FocusAreaManagementCoordinator({
            userService: c.get('userService'),
            focusAreaService: c.get('focusAreaService'),
            focusAreaValidationService: c.get('focusAreaValidationService'),
            focusAreaGenerationCoordinator: c.get('focusAreaGenerationCoordinator'),
            eventBus: c.get('eventBus'),
            eventTypes: c.get('eventTypes'),
            logger: c.get('focusAreaLogger'),
        });
    }, false // Transient: manages user-specific focus areas
    );
    coordinatorLogger.info('[DI Coordinators] Registering progressCoordinator...');
    container.register('progressCoordinator', c => {
        return new ProgressCoordinator({
            progressService: c.get('progressService'),
            userService: c.get('userService'),
            eventBus: c.get('eventBus'),
            eventTypes: c.get('eventTypes'),
            logger: c.get('progressLogger'),
        });
    }, false // Transient: tracks user-specific progress
    );
    // Register event handlers that use coordinators
    coordinatorLogger.info('[DI Coordinators] Registering applicationEventHandlers...');
    container.register('applicationEventHandlers', c => new ApplicationEventHandlers({
        personalityCoordinator: c.get('personalityCoordinator'),
        logger: c.get('eventsLogger'),
        eventBus: c.get('eventBus'),
        EventTypes: c.get('eventTypes')
    }), true); // Singleton
    
    coordinatorLogger.info('[DI Coordinators] Coordinator registration complete.');
}
export { registerCoordinatorComponents };
export default {
    registerCoordinatorComponents
};
