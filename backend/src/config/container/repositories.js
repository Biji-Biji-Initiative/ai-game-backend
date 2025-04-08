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
import RefreshTokenRepository from "#app/core/auth/repositories/RefreshTokenRepository.js";

// --- ADDED IMPORTS from extension ---
import SupabaseRivalRepository from "#app/core/rival/repositories/SupabaseRivalRepository.js";
import SupabaseBadgeRepository from "#app/core/badge/repositories/SupabaseBadgeRepository.js";
import SupabaseLeaderboardRepository from "#app/core/leaderboard/repositories/SupabaseLeaderboardRepository.js";
import SupabaseNetworkRepository from "#app/core/network/repositories/SupabaseNetworkRepository.js";
import SupabaseThreadStateRepository from "#app/core/ai/repositories/SupabaseThreadStateRepository.js";
// --- END ADDED IMPORTS ---

// Import Mappers needed *only* for DI registration factory functions below
// Remove static import of UserMapper
// Add other mapper imports here if they are instantiated directly in registration

'use strict';
/**
 * Repository Components Registration
 *
 * This module registers all repository components in the DI container.
 */
/**
 * Register repository components in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerRepositoryComponents(container, logger) {
    // Use the passed-in logger (which should have the module name, e.g., 'app:repositories')
    const repoLogger = logger || container.get('logger').child({ context: 'DI-Repos' }); // Fallback if logger wasn't passed
    repoLogger.info('Starting repository registration...');

    // Resolve core dependencies ONCE upfront
    let dbInstance;
    let eventBusInstance;
    let configCacheInstance;
    try {
        repoLogger.info('Attempting to resolve core dependencies upfront...');
        dbInstance = container.get('db');
        repoLogger.info(`Resolved 'db': ${!!dbInstance}`);
        eventBusInstance = container.get('eventBus');
        repoLogger.info(`Resolved 'eventBus': ${!!eventBusInstance}`);
        configCacheInstance = container.get('configCache');
        repoLogger.info(`Resolved 'configCache': ${!!configCacheInstance}`);
        
        // Extra check to ensure they are not undefined/null
        if (!dbInstance || !eventBusInstance || !configCacheInstance) {
            throw new Error('One or more core dependencies resolved to null/undefined.');
        }
        repoLogger.info('Successfully resolved core dependencies upfront.');
    } catch (error) {
        repoLogger.error('FATAL: Failed to resolve core dependencies upfront!', { error: error.message, stack: error.stack });
        // Optionally, log container state for debugging
        // repoLogger.debug('Container state during failure:', container.inspect()); 
        throw new Error(`DI failed to resolve core dependencies: ${error.message}`);
    }

    repoLogger.info('Registering Repositories...'); 

    // Register domain repositories

    repoLogger.info('Registering UserRepository...');
    // Revert UserRepository registration to not expect userMapper
    container.register('userRepository', c => { 
        return new UserRepository({
            db: dbInstance, 
            logger: c.get('userLogger'), 
            eventBus: eventBusInstance
            // userMapper removed from constructor args
        });
    }, true); // true for singleton

    repoLogger.info('Registering PersonalityRepository...');
    container.register('personalityRepository', c => new PersonalityRepository({
        db: dbInstance, 
        logger: c.get('personalityLogger'), 
        eventBus: eventBusInstance
    }), true);

    repoLogger.info('Registering ProgressRepository...');
    container.register('progressRepository', c => new ProgressRepository({
        db: dbInstance, 
        logger: c.get('progressLogger'),
        eventBus: eventBusInstance,
        container: c // Pass container itself if needed by the repo
    }), true);

    repoLogger.info('Registering AdaptiveRepository...');
    container.register('adaptiveRepository', c => new AdaptiveRepository({
        db: dbInstance,
        logger: c.get('adaptiveLogger')
    }), true);
    
    repoLogger.info('Registering ChallengeRepository...');
    container.register('challengeRepository', c => new ChallengeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        eventBus: eventBusInstance
    }), true);
    
    repoLogger.info('Registering FocusAreaRepository...');
    container.register('focusAreaRepository', c => new FocusAreaRepository({
        db: dbInstance,
        logger: c.get('focusAreaLogger'),
        eventBus: eventBusInstance,
    }), true);

    repoLogger.info('Registering EvaluationCategoryRepository...');
    container.register('evaluationCategoryRepository', c => new EvaluationCategoryRepository({
        supabase: dbInstance, // Note: Using 'db' as expected by this repo
        logger: c.get('evaluationLogger')
    }), true);

    repoLogger.info('Registering EvaluationRepository...');
    container.register('evaluationRepository', c => new EvaluationRepository({
        db: dbInstance,
        logger: c.get('evaluationLogger'),
        eventBus: eventBusInstance
    }), true);

    repoLogger.info('Registering UserJourneyRepository...');
    container.register('userJourneyRepository', c => new UserJourneyRepository({
        db: dbInstance, 
        logger: c.get('userJourneyLogger'),
        eventBus: eventBusInstance
    }), true);

    // Register challenge configuration repositories
    repoLogger.info('Registering ChallengeTypeRepository...');
    container.register('challengeTypeRepository', c => new ChallengeTypeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance // Use pre-resolved instance
    }), true);

    repoLogger.info('Registering FormatTypeRepository...');
    container.register('formatTypeRepository', c => new FormatTypeRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance
    }), true);

    repoLogger.info('Registering FocusAreaConfigRepository...');
    container.register('focusAreaConfigRepository', c => new FocusAreaConfigRepository({
        db: dbInstance,        // Keep this as 'db' as expected by the constructor
        logger: c.get('challengeLogger'),
        cache: configCacheInstance  // Keep this as 'cache' as expected by the constructor
    }), true);

    repoLogger.info('Registering DifficultyLevelRepository...');
    container.register('difficultyLevelRepository', c => new DifficultyLevelRepository({
        db: dbInstance,
        logger: c.get('challengeLogger'),
        cache: configCacheInstance
    }), true);

    repoLogger.info('Registering RefreshTokenRepository...');
    container.register('refreshTokenRepository', c => new RefreshTokenRepository({
        db: dbInstance,
        logger: c.get('refreshTokenLogger'),
        eventBus: eventBusInstance
    }), true);
    
    // --- ADDED REGISTRATIONS from extension ---
    repoLogger.info('Registering threadStateRepository...');
    container.register('threadStateRepository', () => {
      const supabaseClient = container.get('db'); // Use dbInstance resolved earlier
      return new SupabaseThreadStateRepository({
        supabaseClient,
        logger: container.get('logger')
      });
    }, true); // Assuming singleton

    repoLogger.info('Registering rivalRepository...');
    container.register('rivalRepository', () => {
      const supabaseClient = container.get('db');
      return new SupabaseRivalRepository({
        supabaseClient,
        logger: container.get('logger')
      });
    }, true); // Assuming singleton

    repoLogger.info('Registering badgeRepository...');
    container.register('badgeRepository', () => {
      const supabaseClient = container.get('db');
      return new SupabaseBadgeRepository({
        supabaseClient,
        logger: container.get('logger')
      });
    }, true); // Assuming singleton

    repoLogger.info('Registering leaderboardRepository...');
    container.register('leaderboardRepository', () => {
      const supabaseClient = container.get('db');
      return new SupabaseLeaderboardRepository({
        supabaseClient,
        logger: container.get('logger')
      });
    }, true); // Assuming singleton

    repoLogger.info('Registering networkRepository...');
    container.register('networkRepository', () => {
      const supabaseClient = container.get('db');
      return new SupabaseNetworkRepository({
        supabaseClient,
        logger: container.get('logger')
      });
    }, true); // Assuming singleton
    // --- END ADDED REGISTRATIONS ---

    repoLogger.info('Repository registration complete.');
}

export { registerRepositoryComponents };
export default {
    registerRepositoryComponents
};
