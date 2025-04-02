// import { asClass } from 'awilix';
import UserRepository from "#app/core/user/repositories/UserRepository.js";
import PersonalityRepository from "#app/core/personality/repositories/PersonalityRepository.js";
import ProgressRepository from "#app/core/progress/repositories/ProgressRepository.js";
import AdaptiveRepository from "#app/core/adaptive/repositories/AdaptiveRepository.js";
import ChallengeRepository from "#app/core/challenge/repositories/challengeRepository.js";
import FocusAreaRepository from "#app/core/focusArea/repositories/focusAreaRepository.js";
import EvaluationCategoryRepository from "#app/core/evaluation/repositories/evaluationCategoryRepository.js";
import EvaluationRepository from "#app/core/evaluation/repositories/evaluationRepository.js";
import UserJourneyRepository from "#app/core/userJourney/repositories/UserJourneyRepository.js";
import ChallengeTypeRepository from "#app/core/challenge/repositories/config/ChallengeTypeRepository.js";
import FormatTypeRepository from "#app/core/challenge/repositories/config/FormatTypeRepository.js";
import { FocusAreaConfigRepository } from "#app/core/challenge/repositories/config/FocusAreaConfigRepository.js";
import DifficultyLevelRepository from "#app/core/challenge/repositories/config/DifficultyLevelRepository.js";
'use strict';
/**
 * Repository Components Registration
 *
 * This module registers all repository components in the DI container.
 */
/**
 * Register repository components in the container
 * @param {DIContainer} container - The DI container
 */
function registerRepositoryComponents(container) {
    const repoLogger = container.get('logger').child({ context: 'DI-Repos' }); // Use a specific logger
    repoLogger.info('[DI Repos] Starting repository registration...');

    // Resolve core dependencies ONCE upfront
    let dbInstance;
    let eventBusInstance;
    let configCacheInstance;
    try {
        repoLogger.info('[DI Repos] Attempting to resolve core dependencies upfront...');
        dbInstance = container.get('db');
        repoLogger.info(`[DI Repos] Resolved 'db': ${!!dbInstance}`);
        eventBusInstance = container.get('eventBus');
        repoLogger.info(`[DI Repos] Resolved 'eventBus': ${!!eventBusInstance}`);
        configCacheInstance = container.get('configCache');
        repoLogger.info(`[DI Repos] Resolved 'configCache': ${!!configCacheInstance}`);
        
        // Extra check to ensure they are not undefined/null
        if (!dbInstance || !eventBusInstance || !configCacheInstance) {
            throw new Error('One or more core dependencies resolved to null/undefined.');
        }
        repoLogger.info('[DI Repos] Successfully resolved core dependencies upfront.');
    } catch (error) {
        repoLogger.error('[DI Repos] FATAL: Failed to resolve core dependencies upfront!', { error: error.message, stack: error.stack });
        // Optionally, log container state for debugging
        // repoLogger.debug('[DI Repos] Container state during failure:', container.inspect()); 
        throw new Error(`DI failed to resolve core dependencies: ${error.message}`);
    }

    // Register domain repositories using the custom DIContainer format: container.register(name, factoryFunction, isSingleton);

    repoLogger.info('[DI Repos] Registering UserRepository...');
    container.register('userRepository', c => new UserRepository({
        db: dbInstance, // Use pre-resolved instance
        logger: c.get('userLogger'), // Get specific logger from container
        eventBus: eventBusInstance // Use pre-resolved instance
    }), true); // true for singleton

    repoLogger.info('[DI Repos] Registering PersonalityRepository...');
    container.register('personalityRepository', c => new PersonalityRepository({
        db: dbInstance, 
        logger: c.get('personalityLogger'), 
        eventBus: eventBusInstance
    }), true);

    repoLogger.info('[DI Repos] Registering ProgressRepository...');
    container.register('progressRepository', c => new ProgressRepository({
        db: dbInstance, 
        logger: c.get('progressLogger'),
        eventBus: eventBusInstance,
        container: c // Pass container itself if needed by the repo
    }), true);

    repoLogger.info('[DI Repos] Registering AdaptiveRepository...');
    container.register('adaptiveRepository', c => new AdaptiveRepository({
        db: dbInstance,
        logger: c.get('adaptiveLogger')
    }), true);
    
    repoLogger.info('[DI Repos] Registering ChallengeRepository...');
    container.register('challengeRepository', c => new ChallengeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        eventBus: eventBusInstance
    }), true);
    
    repoLogger.info('[DI Repos] Registering FocusAreaRepository...');
    container.register('focusAreaRepository', c => new FocusAreaRepository({
        db: dbInstance,
        logger: c.get('focusAreaLogger'),
        eventBus: eventBusInstance,
    }), true);

    repoLogger.info('[DI Repos] Registering EvaluationCategoryRepository...');
    container.register('evaluationCategoryRepository', c => new EvaluationCategoryRepository({
        supabase: dbInstance, // Note: Using 'db' as expected by this repo
        logger: c.get('evaluationLogger')
    }), true);

    repoLogger.info('[DI Repos] Registering EvaluationRepository...');
    container.register('evaluationRepository', c => new EvaluationRepository({
        db: dbInstance,
        logger: c.get('evaluationLogger'),
        eventBus: eventBusInstance
    }), true);

    repoLogger.info('[DI Repos] Registering UserJourneyRepository...');
    container.register('userJourneyRepository', c => new UserJourneyRepository({
        db: dbInstance, 
        logger: c.get('userJourneyLogger')
    }), true);

    // Register challenge configuration repositories
    repoLogger.info('[DI Repos] Registering ChallengeTypeRepository...');
    container.register('challengeTypeRepository', c => new ChallengeTypeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance // Use pre-resolved instance
    }), true);

    repoLogger.info('[DI Repos] Registering FormatTypeRepository...');
    container.register('formatTypeRepository', c => new FormatTypeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance
    }), true);

    repoLogger.info('[DI Repos] Registering FocusAreaConfigRepository...');
    container.register('focusAreaConfigRepository', c => new FocusAreaConfigRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance
    }), true);

    repoLogger.info('[DI Repos] Registering DifficultyLevelRepository...');
    container.register('difficultyLevelRepository', c => new DifficultyLevelRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance
    }), true);
    
    repoLogger.info('[DI Repos] Repository registration complete.');
}

export { registerRepositoryComponents };
export default {
    registerRepositoryComponents
};
