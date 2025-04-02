'use strict';

// Core Services
import OpenAIStateManagerAdapter from "#app/core/ai/adapters/OpenAIStateManagerAdapter.js";
import OpenAIClientAdapter from "#app/core/ai/adapters/OpenAIClientAdapter.js";
import PersonalityService from "#app/core/personality/services/PersonalityService.js";
import MockInsightGenerator from "#app/core/infra/services/MockInsightGenerator.js";
import { OpenAIInsightGenerator } from "#app/core/infra/services/OpenAIInsightGenerator.js";
import TraitsAnalysisService from "#app/core/personality/services/TraitsAnalysisService.js";
import PersonalityDataLoader from "#app/core/personality/services/PersonalityDataLoader.js";
import AdaptiveService from "#app/core/adaptive/services/AdaptiveService.js";
import ProgressService from "#app/core/progress/services/ProgressService.js";
// AI Chat Services - temporarily commented out until fixed
// import AiChatService from "#app/services/ai/AiChatService.js";
// import AiAnalysisService from "#app/services/ai/AiAnalysisService.js";
import UserService from "#app/core/user/services/UserService.js";
import UserPreferencesManager from "#app/core/user/services/UserPreferencesManager.js";
import UserJourneyService from "#app/core/userJourney/services/UserJourneyService.js";
import ChallengePersonalizationService from "#app/core/challenge/services/ChallengePersonalizationService.js";
import ChallengeConfigService from "#app/core/challenge/services/ChallengeConfigService.js";
import ChallengeService from "#app/core/challenge/services/ChallengeService.js";
import EvaluationService from "#app/core/evaluation/services/evaluationService.js";
import FocusAreaService from "#app/core/focusArea/services/FocusAreaService.js";
import FocusAreaValidationService from "#app/core/focusArea/services/FocusAreaValidationService.js";
import HealthCheckService from "#app/core/infra/health/HealthCheckService.js";
import ChallengeFactory from "#app/core/challenge/factories/ChallengeFactory.js";
// Application services
import FocusAreaGenerationService from "#app/application/focusArea/FocusAreaGenerationService.js";
import FocusAreaThreadService from "#app/application/focusArea/services/FocusAreaThreadService.js";
import ChallengeGenerationService from "#app/application/challenge/ChallengeGenerationService.js";
import ChallengeEvaluationService from "#app/application/challenge/ChallengeEvaluationService.js";
import { UserContextService } from "#app/application/evaluation/UserContextService.js";
import AuthorizationService from "#app/core/auth/services/AuthorizationService.js";
import PersonalityPromptBuilder from "#app/core/prompt/builders/PersonalityPromptBuilder.js";

/**
 * Service Components Registration
 *
 * This module registers all service components in the DI container.
 * Following best practices, services are registered as transient by default
 * unless they need to maintain shared state or provide performance benefits as singletons.
 */
/**
 * Register service components in the container
 * @param {DIContainer} container - The DI container
 */
function registerServiceComponents(container) {
    const serviceLogger = container.get('logger').child({ context: 'DI-Services' });
    serviceLogger.info('[DI Services] Starting service registration...');

    // Register domain services using the custom DIContainer format
    
    serviceLogger.info('[DI Services] Registering userService...');
    container.register('userService', c => {
        const repo = c.get('userRepository');
        const logger = c.get('userLogger');
        const eventBus = c.get('eventBus');
        const cache = c.get('cacheService');
        if (!repo || !logger || !eventBus || !cache) {
            serviceLogger.error('[DI Services] Missing dependency for userService', { hasRepo: !!repo, hasLogger: !!logger, hasEventBus: !!eventBus, hasCache: !!cache });
            throw new Error('Failed to resolve dependencies for userService');
        }
        const userService = new UserService({
            userRepository: repo,
            logger: logger,
            eventBus: eventBus,
            cacheService: cache,
            // userPreferencesManager will be injected later if needed, or resolved via singleton
        });
        return userService;
    }, true); // Singleton

    serviceLogger.info('[DI Services] Registering userPreferencesManager...');
    container.register('userPreferencesManager', c => new UserPreferencesManager({
        userService: c.get('userService'), // Singleton resolution handles circular dependency
        logger: c.get('userLogger')
    }), true); // Singleton

    serviceLogger.info('[DI Services] Registering personalityService...');
    container.register('personalityService', c => {
        const repository = c.get('personalityRepository');
        const traitsService = c.get('traitsAnalysisService');
        const insightGen = c.get('personalityInsightGenerator');
        if (!repository || !traitsService || !insightGen) {
             serviceLogger.error('[DI Services] Missing dependency for personalityService', { hasRepo: !!repository, hasTraits: !!traitsService, hasInsight: !!insightGen });
             throw new Error('Failed to resolve dependencies for personalityService');
        }
        return new PersonalityService({
             personalityRepository: repository,
             traitsAnalysisService: traitsService,
             insightGenerator: insightGen
        });
    }, false); // Transient

    serviceLogger.info('[DI Services] Registering userJourneyService...');
    container.register('userJourneyService', c => new UserJourneyService({
        userJourneyRepository: c.get('userJourneyRepository'),
        userService: c.get('userService'),
        config: c.get('config'),
        logger: c.get('userJourneyLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering progressService...');
    container.register('progressService', c => new ProgressService({
        progressRepository: c.get('progressRepository'),
        logger: c.get('progressLogger'),
        eventBus: c.get('eventBus')
    }), true); // Changed to Singleton for reliability

    serviceLogger.info('[DI Services] Registering adaptiveService...');
    container.register('adaptiveService', c => new AdaptiveService({
        adaptiveRepository: c.get('adaptiveRepository'),
        progressService: c.get('progressService'),
        personalityService: c.get('personalityService'),
        challengeConfigService: c.get('challengeConfigService'),
        challengePersonalizationService: c.get('challengePersonalizationService'),
        userService: c.get('userService'),
        logger: c.get('adaptiveLogger'),
        eventBus: c.get('eventBus')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering focusAreaService...');
    container.register('focusAreaService', c => new FocusAreaService({
        focusAreaRepository: c.get('focusAreaRepository'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering focusAreaThreadService...');
    container.register('focusAreaThreadService', c => new FocusAreaThreadService({
        focusAreaThreadState: c.get('focusAreaThreadState'),
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering focusAreaValidationService...');
    container.register('focusAreaValidationService', c => new FocusAreaValidationService(
        c.get('focusAreaConfigRepository'),
        c.get('focusAreaLogger')
    ), true); // Singleton

    serviceLogger.info('[DI Services] Registering focusAreaGenerationService...');
    container.register('focusAreaGenerationService', c => new FocusAreaGenerationService({
        openAIClient: c.get('aiClient'),
        MessageRole: c.get('messageRole'),
        openAIStateManager: c.get('aiStateManager'),
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering challengePersonalizationService...');
    container.register('challengePersonalizationService', c => new ChallengePersonalizationService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    serviceLogger.info('[DI Services] Registering challengeConfigService...');
    container.register('challengeConfigService', c => new ChallengeConfigService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        formatTypeRepository: c.get('formatTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        difficultyLevelRepository: c.get('difficultyLevelRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    serviceLogger.info('[DI Services] Registering challengeService...');
    container.register('challengeService', c => new ChallengeService({
        challengeRepository: c.get('challengeRepository'),
        userService: c.get('userService'),
        logger: c.get('challengeLogger'),
        cacheService: c.get('cacheService'),
        cacheInvalidationManager: c.get('cacheInvalidationManager')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering evaluationService...');
    container.register('evaluationService', c => new EvaluationService({
        evaluationRepository: c.get('evaluationRepository'),
        evaluationCategoryRepository: c.get('evaluationCategoryRepository'),
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        eventBus: c.get('eventBus'),
        logger: c.get('evaluationLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering personalityDataLoader...');
    container.register('personalityDataLoader', c => new PersonalityDataLoader({
        personalityRepository: c.get('personalityRepository'),
        cacheService: c.get('cacheService'),
        logger: c.get('personalityLogger')
    }), true); // Singleton

    serviceLogger.info('[DI Services] Registering traitsAnalysisService...');
    container.register('traitsAnalysisService', c => new TraitsAnalysisService({
        personalityRepository: c.get('personalityRepository'),
        logger: c.get('traitsAnalysisLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering personalityInsightGenerator...');
    container.register('personalityInsightGenerator', c => {
        const logger = c.get('personalityLogger');
        if (process.env.NODE_ENV === 'development') {
            logger.info('Using MockInsightGenerator for personality insights.');
            return new MockInsightGenerator();
        }
        logger.info('Using OpenAIInsightGenerator for personality insights.');
        try {
            const aiClient = c.get('aiClient');
            return new OpenAIInsightGenerator({ aiClient: aiClient, logger: logger });
        } catch (error) {
            logger.error('Failed to instantiate OpenAIInsightGenerator. Falling back to mock.', { error: error.message });
            return new MockInsightGenerator();
        }
    }, false); // Transient

    serviceLogger.info('[DI Services] Registering challengeGenerationService...');
    container.register('challengeGenerationService', c => new ChallengeGenerationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('challengeLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering challengeEvaluationService...');
    container.register('challengeEvaluationService', c => new ChallengeEvaluationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('challengeLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering userContextService...');
    container.register('userContextService', c => new UserContextService({
        userRepository: c.get('userRepository'),
        challengeRepository: c.get('challengeRepository'),
        evaluationRepository: c.get('evaluationRepository'),
        cacheService: c.get('cacheService'),
        logger: c.get('evaluationLogger')
    }), false); // Transient

    serviceLogger.info('[DI Services] Registering healthCheckService...');
    // NOTE: HealthCheckService was already registered in infrastructure.js.
    // Re-registering here might overwrite or cause issues. Let's comment this out.
    // container.register('healthCheckService', c => {
    //     return new HealthCheckService({
    //         logger: c.get('infraLogger'),
    //         openAIClient: c.get('openAIClient')
    //     });
    // });

    serviceLogger.info('[DI Services] Registering challengeFactory...');
    container.register('challengeFactory', c => new ChallengeFactory({
        challengeConfigService: c.get('challengeConfigService'),
        focusAreaValidationService: c.get('focusAreaValidationService'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    serviceLogger.info('[DI Services] Registering authorizationService...');
    container.register('authorizationService', () => new AuthorizationService(), true); // Singleton
    
    serviceLogger.info('[DI Services] Service registration complete.');
}

export { registerServiceComponents };
export default {
    registerServiceComponents
};

