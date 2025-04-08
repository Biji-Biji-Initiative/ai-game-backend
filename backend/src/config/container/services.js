'use strict';

import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";

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
// Import the AuthService
import AuthService from "#app/core/auth/services/AuthService.js";
// Import the AdminService
import AdminService from "#app/core/admin/services/AdminService.js";

// --- ADDED IMPORTS from extension ---
import RivalService from "#app/core/rival/services/RivalService.js";
import BadgeService from "#app/core/badge/services/BadgeService.js";
import LeaderboardService from "#app/core/leaderboard/services/LeaderboardService.js";
import NetworkService from "#app/core/network/services/NetworkService.js";
import FeaturePromptBuilders from "#app/core/prompt/builders/FeaturePromptBuilders.js";
// --- END ADDED IMPORTS ---

/**
 * Service Components Registration
 *
 * This module registers all application service components in the DI container.
 */

// Track registered services to prevent duplicates
const registeredServices = new Set();

/**
 * Register service components in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerServiceComponents(container, logger) {
    // Use passed-in logger or fallback
    const serviceLogger = logger || container.get('logger').child({ context: 'DI-Services' });
    serviceLogger.info('Starting service registration...');
    console.log('📦 Starting service registration...');

    // User Domain Services
    registerService(container, serviceLogger, 'userService', c => new UserService({
        userRepository: c.get('userRepository'),
        logger: c.get('userLogger'), // Specific logger for the service
        eventBus: c.get('eventBus'),
        cacheService: c.get('cacheService'), // Added cache dependency
    }), true); // Singleton

    registerService(container, serviceLogger, 'userPreferencesManager', c => new UserPreferencesManager({
        userService: c.get('userService'), // Depends on UserService
        logger: c.get('userLogger')
    }), true); // Singleton
    
    // Personality Domain Services
    registerService(container, serviceLogger, 'personalityService', c => new PersonalityService({
        personalityRepository: c.get('personalityRepository'),
        traitsAnalysisService: c.get('traitsAnalysisService'),
        insightGenerator: c.get('personalityInsightGenerator'),
        logger: c.get('personalityLogger'),
        eventBus: c.get('eventBus')
    }), false); // Transient

    // User Journey Domain Services
    registerService(container, serviceLogger, 'userJourneyService', c => new UserJourneyService({
        userJourneyRepository: c.get('userJourneyRepository'),
        userService: c.get('userService'), // Add userService
        config: c.get('config'), // Add config
        logger: c.get('userJourneyLogger')
    }), false); // Transient

    // Progress Domain Services
    registerService(container, serviceLogger, 'progressService', c => new ProgressService({
        progressRepository: c.get('progressRepository'),
        logger: c.get('progressLogger'), // Changed from generic logger
        eventBus: c.get('eventBus')
    }), true); // Changed to Singleton for reliability

    // Adaptive Domain Services
    registerService(container, serviceLogger, 'adaptiveService', c => new AdaptiveService({
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
    registerService(container, serviceLogger, 'focusAreaService', c => new FocusAreaService({
        focusAreaRepository: c.get('focusAreaRepository'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'), // If needed by service
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    registerService(container, serviceLogger, 'focusAreaThreadService', c => new FocusAreaThreadService({
        focusAreaThreadState: c.get('focusAreaThreadState'), // Assuming thread state adapter is registered
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    registerService(container, serviceLogger, 'focusAreaValidationService', c => new FocusAreaValidationService({
        configRepository: c.get('focusAreaConfigRepository'), // Use config repo
        logger: c.get('focusAreaLogger')
    }), true); // Singleton

    registerService(container, serviceLogger, 'focusAreaGenerationService', c => new FocusAreaGenerationService({
        openAIClient: c.get('aiClient'),
        MessageRole: c.get('messageRole'), // Changed to match constructor parameter name
        openAIStateManager: c.get('aiStateManager'),
        logger: c.get('focusAreaLogger')
    }), false); // Transient

    // Challenge Domain Services
    registerService(container, serviceLogger, 'challengePersonalizationService', c => new ChallengePersonalizationService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    registerService(container, serviceLogger, 'challengeConfigService', c => new ChallengeConfigService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        formatTypeRepository: c.get('formatTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        difficultyLevelRepository: c.get('difficultyLevelRepository'),
        logger: c.get('challengeLogger')
    }), true); // Singleton
    
    // ChallengeService - ensure it's only registered once
    registerService(container, serviceLogger, 'challengeService', c => {
        // Added check for development environment
        const isDevelopment = c.get('config').isDevelopment;
        
        return new ChallengeService({
            challengeRepository: c.get('challengeRepository'),
            userService: c.get('userService'),
            logger: c.get('challengeLogger'),
            cacheService: c.get('cacheService'),
            cacheInvalidationManager: c.get('cacheInvalidationManager'), // Inject invalidation manager
        });
    }, true); // Changed to Singleton to prevent duplicate instances

    // Evaluation Domain Services
    registerService(container, serviceLogger, 'evaluationService', c => new EvaluationService({
        evaluationRepository: c.get('evaluationRepository'),
        categoryRepository: c.get('evaluationCategoryRepository'),
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        eventBus: c.get('eventBus'),
        logger: c.get('evaluationLogger')
    }), false); // Transient
    
    // Traits Analysis Service (assuming it belongs to Personality or a common area)
    registerService(container, serviceLogger, 'personalityDataLoader', c => new PersonalityDataLoader({
        personalityRepository: c.get('personalityRepository'),
        cacheService: c.get('cacheService'),
        logger: c.get('personalityLogger')
    }), true); // Singleton
    
    registerService(container, serviceLogger, 'traitsAnalysisService', c => new TraitsAnalysisService({
        repository: c.get('personalityRepository'),
        logger: c.get('traitsAnalysisLogger') // Use specific logger if defined
    }), false); // Transient

    registerService(container, serviceLogger, 'personalityInsightGenerator', c => new MockInsightGenerator({
        logger: c.get('personalityLogger')
    }), true); // Singleton

    // Challenge Generation/Evaluation Services
    registerService(container, serviceLogger, 'challengeGenerationService', c => new ChallengeGenerationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'), // Register OpenAI specific config
        logger: c.get('challengeLogger')
    }), false); // Transient

    registerService(container, serviceLogger, 'challengeEvaluationService', c => new ChallengeEvaluationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('challengeLogger')
    }), false); // Transient

    // User Context Service
    registerService(container, serviceLogger, 'userContextService', c => new UserContextService({
        userService: c.get('userService'),
        progressService: c.get('progressService'),
        personalityService: c.get('personalityService'),
        logger: c.get('userLogger') // Associated with user domain
    }), true); // Singleton
    
    // Infrastructure Services
    registerService(container, serviceLogger, 'healthCheckService', c => {
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
    registerService(container, serviceLogger, 'challengeConfigServiceProxy', c => {
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

    registerService(container, serviceLogger, 'challengeFactory', c => new ChallengeFactory({
        challengeConfigService: c.get('challengeConfigServiceProxy'), // Match the parameter name in the constructor
        validationService: c.get('focusAreaValidationService'),
        logger: c.get('challengeLogger')
    }), true); // Singleton

    registerService(container, serviceLogger, 'authorizationService', c => new AuthorizationService({
        userService: c.get('userService'), // Needs user data for roles/permissions
        logger: c.get('infraLogger')
    }), true); // Singleton

    // Auth Service
    registerService(container, serviceLogger, 'authService', c => new AuthService({
        db: c.get('db'),
        logger: c.get('userLogger'),
        refreshTokenRepository: c.get('refreshTokenRepository')
    }), true); // singleton

    // Admin Service (for operations that bypass RLS)
    registerService(container, serviceLogger, 'adminService', c => new AdminService({
        supabase: c.get('db'), // Use the service role Supabase client
        logger: c.get('infraLogger')
    }), true); // singleton

    // --- ADDED REGISTRATIONS from extension ---
    serviceLogger.info('Registering featurePromptBuilders...');
    registerService(container, serviceLogger, 'featurePromptBuilders', () => {
      return new FeaturePromptBuilders({
        config: container.get('config'),
        logger: container.get('logger')
      });
    }, true); // Likely singleton

    serviceLogger.info('Registering rivalService...');
    registerService(container, serviceLogger, 'rivalService', () => {
      const rivalRepository = container.get('rivalRepository');
      const promptService = container.get('promptService'); // Needs promptService registration
      const aiService = container.get('aiService'); // Needs aiService registration

      return new RivalService({
        rivalRepository,
        promptService,
        aiService,
        logger: container.get('logger')
      });
    }, false); // Likely transient

    serviceLogger.info('Registering badgeService...');
    registerService(container, serviceLogger, 'badgeService', () => {
      const badgeRepository = container.get('badgeRepository');
      const promptService = container.get('promptService'); // Needs promptService registration

      return new BadgeService({
        badgeRepository,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Likely transient

    serviceLogger.info('Registering leaderboardService...');
    registerService(container, serviceLogger, 'leaderboardService', () => {
      const leaderboardRepository = container.get('leaderboardRepository');
      const promptService = container.get('promptService'); // Needs promptService registration

      return new LeaderboardService({
        leaderboardRepository,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Likely transient

    serviceLogger.info('Registering networkService...');
    registerService(container, serviceLogger, 'networkService', () => {
      const networkRepository = container.get('networkRepository');
      const promptService = container.get('promptService'); // Needs promptService registration

      return new NetworkService({
        networkRepository,
        promptService,
        logger: container.get('logger')
      });
    }, false); // Likely transient
    // --- END ADDED REGISTRATIONS ---

    serviceLogger.info('Service registration complete.');
    console.log('✅ Service registration complete.');
}

/**
 * Helper function to register a service with duplicate detection
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance
 * @param {string} name - Service name
 * @param {Function} factory - Factory function
 * @param {boolean} singleton - Whether to register as singleton
 */
function registerService(container, logger, name, factory, singleton = false) {
    // Check if service is already registered
    if (registeredServices.has(name)) {
        logger.warn(`Service '${name}' is already registered, skipping duplicate registration`);
        startupLogger.logComponentInitialization(`service.${name}`, 'warning', {
            message: 'Service already registered, skipping duplicate registration',
            status: 'skipped'
        });
        console.log(`  ⚠️ Service '${name}' already registered, skipping duplicate registration`);
        return;
    }
    
    // Register the service
    logger.info(`Registering ${name}...`);
    container.register(name, factory, singleton);
    registeredServices.add(name);
    
    // Log registration
    const type = singleton ? 'singleton' : 'transient';
    startupLogger.logComponentInitialization(`service.${name}`, 'success', {
        type: type
    });
    console.log(`  ✓ Registered ${name} as ${type}`);
}

export { registerServiceComponents };
export default {
    registerServiceComponents
};
