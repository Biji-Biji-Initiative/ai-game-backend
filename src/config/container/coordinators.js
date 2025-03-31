import PersonalityCoordinator from "@/application/PersonalityCoordinator.js";
import FocusAreaCoordinatorFacade from "@/application/focusArea/FocusAreaCoordinatorFacade.js";
import ChallengeCoordinator from "@/application/challengeCoordinator.js";
import UserJourneyCoordinator from "@/application/userJourneyCoordinator.js";
import FocusAreaGenerationCoordinator from "@/application/focusArea/FocusAreaGenerationCoordinator.js";
import FocusAreaManagementCoordinator from "@/application/focusArea/FocusAreaManagementCoordinator.js";
import ProgressCoordinator from "@/application/progress/ProgressCoordinator.js";
import ApplicationEventHandlers from "@/application/EventHandlers.js";
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
    // Register application coordinators
    container.register('personalityCoordinator', c => {
        return new PersonalityCoordinator({
            userService: c.get('userService'),
            personalityService: c.get('personalityService'),
            personalityDataLoader: c.get('personalityDataLoader'),
            logger: c.get('personalityLogger')
        });
    }, false // Transient: orchestrates user-specific personality operations
    );
    container.register('focusAreaCoordinator', c => {
        return new FocusAreaCoordinatorFacade({
            userService: c.get('userService'),
            challengeService: c.get('challengeService'),
            progressService: c.get('progressService'),
            focusAreaService: c.get('focusAreaService'),
            focusAreaValidationService: c.get('focusAreaValidationService'),
            focusAreaThreadService: c.get('focusAreaThreadService'),
            focusAreaGenerationService: c.get('focusAreaGenerationService'),
            eventBus: c.get('eventBus'),
            eventTypes: c.get('eventTypes'),
            logger: c.get('focusAreaLogger'),
        });
    }, false // Transient: manages complex user focus area operations
    );
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
    container.register('userJourneyCoordinator', c => {
        return new UserJourneyCoordinator({
            userService: c.get('userService'),
            challengeService: c.get('challengeService'),
            userJourneyService: c.get('userJourneyService'),
            config: c.get('config'),
            logger: c.get('userJourneyLogger'),
        });
    }, false // Transient: handles user-specific journey progress
    );
    // Register more specialized focus area coordinators
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
    container.register('applicationEventHandlers', c => {
        return new ApplicationEventHandlers({
            personalityCoordinator: c.get('personalityCoordinator'),
            logger: c.get('eventsLogger'),
        });
    }, true // Singleton: subscribes to events system-wide, should be initialized once
    );
}
export { registerCoordinatorComponents };
export default {
    registerCoordinatorComponents
};
