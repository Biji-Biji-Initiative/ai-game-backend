import PersonalityCoordinator from "#app/application/PersonalityCoordinator.js";
// import FocusAreaCoordinatorFacade from "#app/application/focusArea/FocusAreaCoordinatorFacade.js"; // REMOVED - Refactored
import ChallengeCoordinator from "#app/application/challengeCoordinator.js";
import UserJourneyCoordinator from "#app/application/userJourneyCoordinator.js";
import FocusAreaGenerationCoordinator from "#app/application/focusArea/FocusAreaGenerationCoordinator.js";
import FocusAreaManagementCoordinator from "#app/application/focusArea/FocusAreaManagementCoordinator.js";
import ProgressCoordinator from "#app/application/progress/ProgressCoordinator.js";
import ApplicationEventHandlers from "#app/application/EventHandlers.js";

// --- ADDED IMPORTS from extension ---
import RivalCoordinator from "#app/application/rival/RivalCoordinator.js";
import BadgeCoordinator from "#app/application/badge/BadgeCoordinator.js";
import LeaderboardCoordinator from "#app/application/leaderboard/LeaderboardCoordinator.js";
import NetworkCoordinator from "#app/application/network/NetworkCoordinator.js";
// --- END ADDED IMPORTS ---

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
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerCoordinatorComponents(container, logger) {
    // Use passed-in logger or fallback
    const coordinatorLogger = logger || container.get('logger').child({ context: 'DI-Coordinators' });
    coordinatorLogger.info('Starting coordinator registration...');

    // Register personalityCoordinator
    coordinatorLogger.info('Registering personalityCoordinator...');
    container.register('personalityCoordinator', c => {
        // Get dependencies
        const userService = c.get('userService');
        const personalityService = c.get('personalityService');
        const personalityDataLoader = c.get('personalityDataLoader'); // Corrected dependency name
        const logger = c.get('personalityLogger');

        // Validate dependencies (add more checks if needed)
        if (!userService || !personalityService || !personalityDataLoader || !logger) {
            coordinatorLogger.error('Missing dependency for personalityCoordinator');
            throw new Error('Failed to resolve dependencies for personalityCoordinator');
        }

        return new PersonalityCoordinator({
            userService: userService,
            personalityService: personalityService,
            personalityDataLoader: personalityDataLoader,
            logger: logger,
        });
    }, false // Transient
    );
    
    // Register challengeCoordinator
    coordinatorLogger.info('Registering challengeCoordinator...');
    container.register('challengeCoordinator', c => {
        // Resolve dependencies
        const userService = c.get('userService');
        const challengeService = c.get('challengeService');
        const configService = c.get('challengeConfigServiceProxy');
        const challengeFactory = c.get('challengeFactory');
        const generationService = c.get('challengeGenerationService');
        const evaluationService = c.get('challengeEvaluationService');
        const logger = c.get('challengeLogger');
        
        // Validate dependencies
        if (!userService || !challengeService || !configService || !challengeFactory || !generationService || !evaluationService || !logger) {
            coordinatorLogger.error('Missing one or more dependencies for challengeCoordinator', { 
                userService: !!userService, challengeService: !!challengeService, 
                configService: !!configService, challengeFactory: !!challengeFactory,
                generationService: !!generationService, evaluationService: !!evaluationService,
                logger: !!logger
            });
            throw new Error('Failed to resolve dependencies for challengeCoordinator');
        }

        return new ChallengeCoordinator({
            userService,
            challengeService,
            challengeConfigService: configService,
            challengeFactory,
            challengeGenerationService: generationService,
            challengeEvaluationService: evaluationService,
            logger,
        });
    }, false // Transient: manages user-specific challenge operations
    );
    
    // Register userJourneyCoordinator
    coordinatorLogger.info('Registering userJourneyCoordinator...');
    container.register('userJourneyCoordinator', c => {
        return new UserJourneyCoordinator({
            userJourneyRepository: c.get('userJourneyRepository'),
            userRepository: c.get('userRepository'),
            logger: c.get('userJourneyLogger'),
        });
    }, false // Transient: handles user-specific journey progress
    );
    
    // Register more specialized focus area coordinators
    coordinatorLogger.info('Registering focusAreaGenerationCoordinator...');
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
    
    coordinatorLogger.info('Registering focusAreaManagementCoordinator...');
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
    
    coordinatorLogger.info('Registering progressCoordinator...');
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
    coordinatorLogger.info('Registering applicationEventHandlers...');
    container.register('applicationEventHandlers', async c => {
        const eventBus = await c.get('eventBus');
        coordinatorLogger.debug('Successfully resolved eventBus for applicationEventHandlers');
        
        return new ApplicationEventHandlers({
            personalityCoordinator: c.get('personalityCoordinator'),
            logger: c.get('eventsLogger'),
            eventBus: eventBus,
            EventTypes: c.get('eventTypes')
        });
    }, true); // Singleton
    
    // --- ADDED REGISTRATIONS from extension ---
    coordinatorLogger.info('Registering rivalCoordinator...');
    container.register('rivalCoordinator', () => {
      const rivalService = container.get('rivalService');
      const userService = container.get('userService');
      const personalityService = container.get('personalityService');
      const promptService = container.get('promptService');
      const challengeService = container.get('challengeService');

      return new RivalCoordinator({
        rivalService,
        userService,
        personalityService,
        promptService,
        challengeService,
        logger: container.get('logger')
      });
    }, false); // Assuming transient

    coordinatorLogger.info('Registering badgeCoordinator...');
    container.register('badgeCoordinator', () => {
      const badgeService = container.get('badgeService');
      const userService = container.get('userService');
      const progressService = container.get('progressService');
      const promptService = container.get('promptService');

      return new BadgeCoordinator({
        badgeService,
        userService,
        progressService,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Assuming transient

    coordinatorLogger.info('Registering leaderboardCoordinator...');
    container.register('leaderboardCoordinator', () => {
      const leaderboardService = container.get('leaderboardService');
      const userService = container.get('userService');
      const challengeService = container.get('challengeService');
      const promptService = container.get('promptService');

      return new LeaderboardCoordinator({
        leaderboardService,
        userService,
        challengeService,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Assuming transient

    coordinatorLogger.info('Registering networkCoordinator...');
    container.register('networkCoordinator', () => {
      const networkService = container.get('networkService');
      const userService = container.get('userService');
      const progressService = container.get('progressService');
      const rivalService = container.get('rivalService');
      const promptService = container.get('promptService');

      return new NetworkCoordinator({
        networkService,
        userService,
        progressService,
        rivalService,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Assuming transient
    // --- END ADDED REGISTRATIONS ---
    
    coordinatorLogger.info('Coordinator registration complete.');
}
export { registerCoordinatorComponents };
export default {
    registerCoordinatorComponents
};
