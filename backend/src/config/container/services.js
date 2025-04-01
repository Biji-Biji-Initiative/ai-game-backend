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
    // Register domain services - generally not singletons as they should be stateless
    // and safe to use in concurrent requests
    container.register('userService', c => {
        const userService = new UserService({
            userRepository: c.get('userRepository'),
            logger: c.get('userLogger'),
            eventBus: c.get('eventBus'),
            cacheService: c.get('cacheService')
        });
        
        // Set up for dependency injection after both services are created
        setTimeout(() => {
            try {
                userService.userPreferencesManager = c.get('userPreferencesManager');
            } catch (error) {
                c.get('userLogger').error('Failed to inject userPreferencesManager into userService', { error });
            }
        }, 0);
        
        return userService;
    }, false // Transient: user-specific operations should be isolated
    );
    
    // Register UserPreferencesManager
    container.register('userPreferencesManager', c => {
        return new UserPreferencesManager({
            userService: c.get('userService'),
            logger: c.get('userLogger')
        });
    }, false // Transient: handles user-specific preference operations
    );
    
    container.register('personalityService', c => {
        console.log('[DI Services] Attempting to register PersonalityService...');
        // Explicitly resolve dependencies first
        const repository = c.get('personalityRepository');
        const traitsService = c.get('traitsAnalysisService');
        const insightGen = c.get('personalityInsightGenerator');

        console.log('[DI Services] Dependencies resolved for PersonalityService:', {
             hasRepo: !!repository,
             hasTraitsService: !!traitsService,
             hasInsightGen: !!insightGen
        });

        // We rely on the PersonalityService constructor to throw if deps are missing now
        // if (!repository) throw new Error('personalityRepository unavailable for PersonalityService');
        // if (!traitsService) throw new Error('traitsAnalysisService unavailable for PersonalityService');
        // if (!insightGen) throw new Error('personalityInsightGenerator unavailable for PersonalityService');

        console.log('[DI Services] Instantiating PersonalityService...');
        const instance = new PersonalityService({
             personalityRepository: repository, 
             traitsAnalysisService: traitsService, 
             insightGenerator: insightGen
        });
        console.log('[DI Services] PersonalityService instantiated successfully.');
        return instance;
        
        // REMOVED old try/catch with mock fallback logic
        
    }, false // Transient: handles user-specific personality data
    );
    container.register('userJourneyService', c => {
        return new UserJourneyService({
            userJourneyRepository: c.get('userJourneyRepository'),
            logger: c.get('userJourneyLogger'),
        });
    }, false // Transient: handles user-specific journey data
    );
    container.register('progressService', c => {
        return new ProgressService({
            progressRepository: c.get('progressRepository'),
            logger: c.get('logger'),
            eventBus: c.get('eventBus'),
        });
    }, false // Transient: handles user-specific progress data
    );
    container.register('adaptiveService', c => {
        return new AdaptiveService({
            adaptiveRepository: c.get('adaptiveRepository'),
            logger: c.get('adaptiveLogger'),
            eventBus: c.get('eventBus'),
        });
    }, false // Transient: handles user-specific adaptive difficulty
    );
    // Register focus area services
    container.register('focusAreaService', c => {
        return new FocusAreaService({
            focusAreaRepository: c.get('focusAreaRepository'),
            eventBus: c.get('eventBus'),
            eventTypes: c.get('eventTypes'),
            logger: c.get('focusAreaLogger')
        });
    }, false // Transient: handles user-specific focus areas
    );
    // Register focusAreaThreadService
    container.register('focusAreaThreadService', c => {
        return new FocusAreaThreadService({
            focusAreaThreadState: c.get('focusAreaThreadState'),
            logger: c.get('focusAreaLogger')
        });
    }, false); // Transient: manages user-specific focus area threads
    
    // Register focusAreaValidationService
    container.register('focusAreaValidationService', c => {
        return new FocusAreaValidationService(
            c.get('focusAreaConfigRepository'), 
            c.get('focusAreaLogger')
        );
    }, true); // Singleton: validation rules don't change frequently
    
    // Application service for focus area generation
    container.register('focusAreaGenerationService', c => {
        return new FocusAreaGenerationService({
            openAIClient: c.get('aiClient'),
            MessageRole: c.get('messageRole'),
            openAIStateManager: c.get('aiStateManager'),
            logger: c.get('focusAreaLogger')
        });
    }, false // Transient: generates user-specific focus areas
    );
    // Challenge-related services
    container.register('challengePersonalizationService', c => {
        return new ChallengePersonalizationService({
            challengeTypeRepository: c.get('challengeTypeRepository'),
            focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
            logger: c.get('challengeLogger')
        });
    }, true // Singleton: primarily reads from config repositories which are cached
    );
    container.register('challengeConfigService', c => {
        return new ChallengeConfigService({
            challengeTypeRepository: c.get('challengeTypeRepository'),
            formatTypeRepository: c.get('formatTypeRepository'),
            focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
            difficultyLevelRepository: c.get('difficultyLevelRepository'),
            logger: c.get('challengeLogger')
        });
    }, true // Singleton: primarily reads from config repositories which are cached
    );
    container.register('challengeService', c => {
        return new ChallengeService({
            challengeRepository: c.get('challengeRepository'),
            logger: c.get('challengeLogger'),
        });
    }, false // Transient: handles user-specific challenge operations
    );
    container.register('evaluationService', c => {
        return new EvaluationService({
            evaluationRepository: c.get('evaluationRepository'),
            evaluationCategoryRepository: c.get('evaluationCategoryRepository'),
            aiClient: c.get('aiClient'),
            aiStateManager: c.get('aiStateManager'),
            eventBus: c.get('eventBus'),
            logger: c.get('evaluationLogger'),
        });
    }, false // Transient: handles user-specific evaluation operations
    );
    // AI-related services
    // container.register('aiChatService', c => {
    //     return new AiChatService({
    //         openai: c.get('openai'),
    //         conversationStateManager: c.get('conversationStateManager'),
    //         logger: c.get('logger'),
    //     });
    // }, false // Transient: manages conversation state which is request-specific
    // );
    // container.register('aiAnalysisService', c => {
    //     return new AiAnalysisService({
    //         openai: c.get('openai'),
    //         logger: c.get('logger'),
    //     });
    // }, false // Transient: should not maintain state between requests
    // );
    // Register PersonalityDataLoader
    container.register('personalityDataLoader', c => {
        return new PersonalityDataLoader({
            personalityRepository: c.get('personalityRepository'),
            cacheService: c.get('cacheService'),
            logger: c.get('personalityLogger')
        });
    }, true // Singleton: maintains internal cache for performance
    );
    // Register TraitsAnalysis Service
    container.register('traitsAnalysisService', c => {
        return new TraitsAnalysisService({
            personalityRepository: c.get('personalityRepository'),
            logger: c.get('traitsAnalysisLogger'),
        });
    }, false // Transient: performs analysis on user-specific data
    );
    
    // Register Personality Insight Generator
    container.register('personalityInsightGenerator', c => {
        const logger = c.get('personalityLogger');
        // Use MockInsightGenerator in development mode
        if (process.env.NODE_ENV === 'development') {
            logger.info('Using MockInsightGenerator for personality insights.');
            return new MockInsightGenerator();
        }
        // Use OpenAIInsightGenerator in production, injecting dependencies
        logger.info('Using OpenAIInsightGenerator for personality insights.');
        try {
            const aiClient = c.get('aiClient');
            // PersonalityPromptBuilder uses static methods, no instance needed from DI
            return new OpenAIInsightGenerator({
                aiClient: aiClient,
                logger: logger,
                // Pass the builder class itself if needed, or rely on static calls
                // personalityPromptBuilder: PersonalityPromptBuilder 
            });
        } catch (error) {
            logger.error('Failed to instantiate OpenAIInsightGenerator. Falling back to mock.', { error: error.message });
            return new MockInsightGenerator(); // Fallback to mock if dependencies fail
        }
    }, false // Transient: generates user-specific insights
    );

    // Register application services moved from domain layer
    container.register('challengeGenerationService', c => {
        return new ChallengeGenerationService({
            aiClient: c.get('aiClient'),
            aiStateManager: c.get('aiStateManager'),
            openAIConfig: c.get('openAIConfig'),
            logger: c.get('challengeLogger')
        });
    }, false // Transient: generates user-specific challenges
    );
    
    container.register('challengeEvaluationService', c => {
        return new ChallengeEvaluationService({
            aiClient: c.get('aiClient'),
            aiStateManager: c.get('aiStateManager'),
            openAIConfig: c.get('openAIConfig'),
            logger: c.get('challengeLogger')
        });
    }, false // Transient: evaluates user-specific challenge responses
    );
    
    container.register('userContextService', c => {
        return new UserContextService({
            userRepository: c.get('userRepository'),
            challengeRepository: c.get('challengeRepository'),
            evaluationRepository: c.get('evaluationRepository'),
            cacheService: c.get('cacheService'),
            logger: c.get('evaluationLogger')
        });
    }, false // Transient: manages user-specific context
    );
    
    // Miscellaneous utilities
    container.register('healthCheckService', c => {
        return new HealthCheckService({
            logger: c.get('infraLogger'),
            openAIClient: c.get('openAIClient')
        });
    });

    // Register challenge factory
    container.register('challengeFactory', c => {
        return new ChallengeFactory({
            challengeConfigService: c.get('challengeConfigService'),
            focusAreaValidationService: c.get('focusAreaValidationService'),
            logger: c.get('challengeLogger')
        });
    }, true); // Singleton: primarily creates entities based on configuration

    // Auth-related services
    container.register('authorizationService', () => {
        return new AuthorizationService();
    }, true); // Singleton: stateless service that handles authorization rules
}
export { registerServiceComponents };
export default {
    registerServiceComponents
};

