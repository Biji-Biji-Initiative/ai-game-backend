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
 * This module registers all application service components in the DI container.
 */

/**
 * Register service components in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerServiceComponents(container, logger) {
    // Use passed-in logger or fallback
    const serviceLogger = logger || container.get('logger').child({ context: 'DI-Services' });
    serviceLogger.info('Starting service registration...');

    // User Domain Services
    serviceLogger.info('Registering userService...');
    container.register('userService', c => new UserService({
        userRepository: c.get('userRepository'),
        logger: c.get('userLogger'), // Specific logger for the service
        eventBus: c.get('eventBus'),
        cacheService: c.get('cacheService'), // Added cache dependency
    }), true); // Singleton

    serviceLogger.info('Registering userPreferencesManager...');
    container.register('userPreferencesManager', c => new UserPreferencesManager({
        userService: c.get('userService'), // Depends on UserService
        logger: c.get('userLogger')
    }), true); // Singleton
    
    // Personality Domain Services
    serviceLogger.info('Registering personalityService...');
    container.register('personalityService', c => new PersonalityService({
        personalityRepository: c.get('personalityRepository'),
        traitsAnalysisService: c.get('traitsAnalysisService'),
        insightGenerator: c.get('personalityInsightGenerator'),
        logger: c.get('personalityLogger'),
        eventBus: c.get('eventBus')
    }), false); // Transient

    // User Journey Domain Services
    serviceLogger.info('Registering userJourneyService...');
    container.register('userJourneyService', c => new UserJourneyService({
        userJourneyRepository: c.get('userJourneyRepository'),
        userService: c.get('userService'), // Add userService
        config: c.get('config'), // Add config
        logger: c.get('userJourneyLogger')
    }), false); // Transient

    // Progress Domain Services
    serviceLogger.info('Registering progressService...');
    container.register('progressService', c => new ProgressService({
        progressRepository: c.get('progressRepository'),
        logger: c.get('progressLogger'), // Changed from generic logger
        eventBus: c.get('eventBus')
    }), true); // Changed to Singleton for reliability

    // Adaptive Domain Services
    serviceLogger.info('Registering adaptiveService...');
    container.register('adaptiveService', c => new AdaptiveService({
        adaptiveRepository: c.get('adaptiveRepository'),
        progressService: c.get('progressService'),
        personalityService: c.get('personalityService'),
        challengeConfigService: c.get('challengeConfigService'),
        challengePersonalizationService: c.get('challengePersonalizationService'),
        userService: c.get('userService'),
        logger: c.get('adaptiveLogger'),
        cacheService: c.get('cacheService'), // Added cache dependency
        eventBus: c.get('eventBus') // Make sure this is needed/used by AdaptiveService
    }), false); // Transient
    
    // Focus Area Domain Services
    serviceLogger.info('Registering focusAreaService...');
    container.register('focusAreaService', c => new FocusAreaService({
        focusAreaRepository: c.get('focusAreaRepository'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'), // If needed by service
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    serviceLogger.info('Registering focusAreaThreadService...');
    container.register('focusAreaThreadService', c => new FocusAreaThreadService({
        focusAreaThreadState: c.get('focusAreaThreadState'), // Assuming thread state adapter is registered
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    serviceLogger.info('Registering focusAreaValidationService...');
    container.register('focusAreaValidationService', c => new FocusAreaValidationService({
        configRepository: c.get('focusAreaConfigRepository'), // Use config repo
        logger: c.get('focusAreaLogger')
    }), true); // Singleton

    serviceLogger.info('Registering focusAreaGenerationService...');
    container.register('focusAreaGenerationService', c => new FocusAreaGenerationService({
        openAIClient: c.get('aiClient'),
        MessageRole: c.get('messageRole'), // Changed to match constructor parameter name
        openAIStateManager: c.get('aiStateManager'),
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    // Challenge Domain Services
    serviceLogger.info('Registering challengePersonalizationService...');
    container.register('challengePersonalizationService', c => new ChallengePersonalizationService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    serviceLogger.info('Registering challengeConfigService...');
    container.register('challengeConfigService', c => new ChallengeConfigService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        formatTypeRepository: c.get('formatTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        difficultyLevelRepository: c.get('difficultyLevelRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton
    
    serviceLogger.info('Registering challengeService...');
    container.register('challengeService', c => {
        // Added check for development environment
        const isDevelopment = c.get('config').isDevelopment;
        if (isDevelopment) {
            serviceLogger.debug('ChallengeService running in development mode with real repository');
        }
        return new ChallengeService({
            challengeRepository: c.get('challengeRepository'),
            userService: c.get('userService'),
            logger: c.get('challengeLogger'),
            cacheService: c.get('cacheService'),
            cacheInvalidationManager: c.get('cacheInvalidationManager'), // Inject invalidation manager
        });
    }, false); // Transient

    // Evaluation Domain Services
    serviceLogger.info('Registering evaluationService...');
    container.register('evaluationService', c => new EvaluationService({
        evaluationRepository: c.get('evaluationRepository'),
        categoryRepository: c.get('evaluationCategoryRepository'),
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        eventBus: c.get('eventBus'),
        logger: c.get('evaluationLogger')
    }), false); // Transient
    
    // Traits Analysis Service (assuming it belongs to Personality or a common area)
    serviceLogger.info('Registering personalityDataLoader...');
    container.register('personalityDataLoader', c => new PersonalityDataLoader({
        personalityRepository: c.get('personalityRepository'),
        cacheService: c.get('cacheService'),
        logger: c.get('personalityLogger')
    }), true); // Singleton
    
    serviceLogger.info('Registering traitsAnalysisService...');
    container.register('traitsAnalysisService', c => new TraitsAnalysisService({
        repository: c.get('personalityRepository'),
        logger: c.get('traitsAnalysisLogger') // Use specific logger if defined
    }), false); // Transient

    serviceLogger.info('Registering personalityInsightGenerator...');
    // Registering a Mock implementation for now
    container.register('personalityInsightGenerator', c => new MockInsightGenerator({
        logger: c.get('personalityLogger')
    }), true); // Singleton

    // Challenge Generation/Evaluation Services
    serviceLogger.info('Registering challengeGenerationService...');
    container.register('challengeGenerationService', c => new ChallengeGenerationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'), // Register OpenAI specific config
        logger: c.get('challengeLogger')
    }), false); // Transient

    serviceLogger.info('Registering challengeEvaluationService...');
    container.register('challengeEvaluationService', c => new ChallengeEvaluationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('challengeLogger')
    }), false); // Transient

    // User Context Service
    serviceLogger.info('Registering userContextService...');
    container.register('userContextService', c => new UserContextService({
        userService: c.get('userService'),
        progressService: c.get('progressService'),
        personalityService: c.get('personalityService'),
        logger: c.get('userLogger') // Associated with user domain
    }), true); // Singleton
    
    // Infrastructure Services
    serviceLogger.info('Registering healthCheckService...');
    container.register('healthCheckService', c => {
        const dbClient = c.get('db');
        const aiClient = c.get('aiClient'); // This is our OpenAIClientAdapter
        const logger = c.get('infraLogger');
        
        // Define the database health check function
        const runDatabaseHealthCheck = async () => {
            const startTime = Date.now();
            try {
                if (dbClient && typeof dbClient.rpc === 'function') {
                    await dbClient.rpc('echo', { message: 'health_check' });
                    const responseTime = Date.now() - startTime;
                    return { status: 'healthy', message: 'Database connection successful', responseTime };
                } else {
                    logger.warn('Database client (db) or .rpc method not available for health check.');
                    return { status: 'unknown', message: 'DB client unavailable for check', responseTime: 0 };
                }
            } catch (error) {
                logger.error('Database health check failed', { error: error.message });
                return { status: 'error', message: `Database check error: ${error.message}`, responseTime: Date.now() - startTime };
            }
        };

        // Define the OpenAI health check function
        const checkOpenAIStatus = async (client) => {
            const startTime = Date.now();
            if (!client) {
                logger.warn('OpenAI client adapter (aiClient) not available for health check.');
                return { status: 'unknown', message: 'AI Client adapter unavailable for check', responseTime: 0 };
            }
            try {
                // Attempt to access the underlying OpenAI client
                const openAIClient = client.openAIClient;
                
                if (!openAIClient) {
                    logger.warn('Underlying OpenAI client not available in adapter.');
                    return { 
                        status: 'unknown', 
                        message: 'Underlying OpenAI client unavailable for check', 
                        responseTime: 0 
                    };
                }
                
                // Make a minimal API call to OpenAI to test actual connectivity
                const response = await Promise.race([
                    // Use the OpenAI SDK's models.list method which is lightweight
                    openAIClient.models.list({ limit: 1 }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('OpenAI API timeout')), 5000)
                    )
                ]);
                
                const responseTime = Date.now() - startTime;
                return { 
                    status: 'healthy', 
                    message: 'OpenAI API connection successful', 
                    responseTime 
                };
            } catch (error) {
                logger.error('OpenAI health check failed', { error: error.message });
                return { 
                    status: 'error', 
                    message: `OpenAI check error: ${error.message}`,
                    responseTime: Date.now() - startTime
                };
            }
        };

        // Pass the correctly named dependencies
        return new HealthCheckService({
            runDatabaseHealthCheck, 
            openAIClient: aiClient, // Pass adapter as openAIClient
            checkOpenAIStatus, // Provide the external check function
            logger 
        });
    }, true); // Singleton
    
    // Create a proxy for the challengeConfigService methods that will be used by challengeFactory
    // This breaks the circular dependency between challengeFactory and challengeConfigService
    serviceLogger.info('Registering challengeConfigServiceProxy...');
    container.register('challengeConfigServiceProxy', c => {
        // Get the repositories directly instead of depending on the full challengeConfigService
        const challengeTypeRepository = c.get('challengeTypeRepository');
        const formatTypeRepository = c.get('formatTypeRepository');
        const focusAreaConfigRepository = c.get('focusAreaConfigRepository');
        const logger = c.get('challengeLogger');

        // Return only the methods needed by challengeFactory
        return {
            // Implement basic proxy methods that forward to repositories
            async getChallengeTypeByCode(typeCode) {
                return challengeTypeRepository.getChallengeTypeByCode(typeCode);
            },
            async getFormatTypeByCode(formatCode) {
                return formatTypeRepository.getFormatTypeByCode(formatCode);
            },
            async getAllChallengeTypes() {
                return challengeTypeRepository.getChallengeTypes();
            },
            async getAllFormatTypes() {
                return formatTypeRepository.getFormatTypes();
            },
            async getAllFocusAreaConfigs() {
                return focusAreaConfigRepository.getFocusAreas();
            },
            async getRecommendedChallengeParameters(user, recentChallenges) {
                // Basic implementation that doesn't depend on the full service
                logger.info('Using proxy implementation of getRecommendedChallengeParameters');
                const challengeTypes = await challengeTypeRepository.getChallengeTypes();
                const formatTypes = await formatTypeRepository.getFormatTypes();
                return {
                    challengeType: challengeTypes[0] || { code: 'default', name: 'Default Challenge' },
                    formatType: formatTypes[0] || { code: 'default', name: 'Default Format' },
                    focusArea: 'Communication',
                    difficulty: 'medium'
                };
            }
        };
    }, true); // Singleton

    serviceLogger.info('Registering challengeFactory...');
    container.register('challengeFactory', c => new ChallengeFactory({
        challengeConfigService: c.get('challengeConfigServiceProxy'), // Match the parameter name in the constructor
        validationService: c.get('focusAreaValidationService'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    serviceLogger.info('Registering authorizationService...');
    container.register('authorizationService', c => new AuthorizationService({
        userService: c.get('userService'), // Needs user data for roles/permissions
        logger: c.get('infraLogger')
    }), true); // Singleton

    serviceLogger.info('Service registration complete.');
}

export { registerServiceComponents };
export default {
    registerServiceComponents
};

