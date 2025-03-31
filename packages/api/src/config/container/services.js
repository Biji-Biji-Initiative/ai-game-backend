// Core Services
import OpenAIStateManagerAdapter from "../../core/ai/adapters/OpenAIStateManagerAdapter.js";
import OpenAIClientAdapter from "../../core/ai/adapters/OpenAIClientAdapter.js";
import PersonalityService from "../../core/personality/services/PersonalityService.js";
import MockInsightGenerator from "../../core/infra/services/MockInsightGenerator.js";
import { OpenAIInsightGenerator } from "../../core/infra/services/OpenAIInsightGenerator.js";
import TraitsAnalysisService from "../../core/personality/services/TraitsAnalysisService.js";
import PersonalityDataLoader from "../../core/personality/services/PersonalityDataLoader.js";
import AdaptiveService from "../../core/adaptive/services/AdaptiveService.js";
import ProgressService from "../../core/progress/services/ProgressService.js";
// AI Chat Services - temporarily commented out until fixed
// import AiChatService from "../../services/ai/AiChatService.js";
// import AiAnalysisService from "../../services/ai/AiAnalysisService.js";
import UserService from "../../core/user/services/UserService.js";
import UserJourneyService from "../../core/userJourney/services/UserJourneyService.js";
import ChallengePersonalizationService from "../../core/challenge/services/ChallengePersonalizationService.js";
import ChallengeConfigService from "../../core/challenge/services/ChallengeConfigService.js";
import { ChallengeService } from "../../core/challenge/services/ChallengeService.js";
import EvaluationService from "../../core/evaluation/services/evaluationService.js";
import FocusAreaService from "../../core/focusArea/services/FocusAreaService.js";
import FocusAreaThreadService from "../../core/focusArea/services/focusAreaThreadService.js";
import FocusAreaValidationService from "../../core/focusArea/services/FocusAreaValidationService.js";
import HealthCheckService from "../../core/infra/health/HealthCheckService.js";
import ChallengeFactory from "../../core/challenge/factories/ChallengeFactory.js";
// Application services
import FocusAreaGenerationService from "@/application/focusArea/FocusAreaGenerationService.js";
import ChallengeGenerationService from "@/application/challenge/ChallengeGenerationService.js";
import ChallengeEvaluationService from "@/application/challenge/ChallengeEvaluationService.js";
import { UserContextService } from "@/application/evaluation/UserContextService.js";
import { MessageRole } from '../../core/infra/openai/types.js';
'use strict';
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
        return new UserService({
            userRepository: c.get('userRepository'),
            logger: c.get('logger'),
            iEventBus: c.get('iEventBus'),
            cacheService: c.get('cacheService')
        });
    }, false // Transient: user-specific operations should be isolated
    );

    container.register('personalityService', c => {
        return new PersonalityService(c.get('personalityRepository'), c.get('traitsAnalysisService'), c.get('personalityInsightGenerator'));
    }, false // Transient: handles user-specific personality data
    );
    container.register('userJourneyService', c => {
        return new UserJourneyService({
            userJourneyRepository: c.get('userJourneyRepository'),
            logger: c.get('logger'),
        });
    }, false // Transient: handles user-specific journey data
    );
    container.register('progressService', c => {
        return new ProgressService({
            progressRepository: c.get('progressRepository'),
            logger: c.get('logger'),
            iEventBus: c.get('iEventBus'),
        });
    }, false // Transient: handles user-specific progress data
    );
    container.register('adaptiveService', c => {
        return new AdaptiveService({
            adaptiveRepository: c.get('adaptiveRepository'),
            logger: c.get('logger'),
            iEventBus: c.get('iEventBus'),
        });
    }, false // Transient: handles user-specific adaptive difficulty
    );
    // Register focus area services
    container.register('focusAreaService', c => {
        return new FocusAreaService({
            focusAreaRepository: c.get('focusAreaRepository'),
            iEventBus: c.get('iEventBus'),
            logger: c.get('logger')
        });
    }, false // Transient: handles user-specific focus areas
    );
    // Register focusAreaThreadService
    container.register('focusAreaThreadService', c => {
        return new FocusAreaThreadService({
            openAIStateManager: c.get('aiStateManager'),
            logger: c.get('focusAreaLogger')
        });
    }, false); // Transient: manages user-specific focus area threads

    // Register focusAreaValidationService
    container.register('focusAreaValidationService', c => {
        return new FocusAreaValidationService({
            focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
            logger: c.get('focusAreaLogger')
        });
    }, true); // Singleton: validation rules don't change frequently

    // Application service for focus area generation
    container.register('focusAreaGenerationService', c => {
        // Import MessageRole from the ES module imported at the top

        return new FocusAreaGenerationService({
            openAIClient: c.get('aiClient'),
            // Using imported MessageRole
            MessageRole,
            openAIStateManager: c.get('aiStateManager'),
            focusAreaFactory: c.get('focusAreaFactory'),
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
            iEventBus: c.get('iEventBus'),
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
        // Use MockInsightGenerator in development mode
        if (process.env.NODE_ENV === 'development') {
            return new MockInsightGenerator();
        }
        // Use OpenAIInsightGenerator in production
        return new OpenAIInsightGenerator();
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
            logger: c.get('logger'),
            openai: c.get('openAIClient')
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
}
export { registerServiceComponents };
export default {
    registerServiceComponents
};

