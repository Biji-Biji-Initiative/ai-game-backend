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
    // Register domain repositories
    container.register('userRepository', c => {
        return new UserRepository(c.get('supabase'), c.get('userLogger'));
    }, true);
    container.register('personalityRepository', c => {
        console.log('[DI Repos] Attempting to register PersonalityRepository...');
        // Explicitly resolve dependencies first
        const dbClient = c.get('supabase');
        const loggerInstance = c.get('personalityLogger');
        const eventBusInstance = c.get('eventBus');
        
        console.log('[DI Repos] Dependencies resolved for PersonalityRepository:', {
             hasDb: !!dbClient,
             hasLogger: !!loggerInstance,
             hasEventBus: !!eventBusInstance
        });

        if (!dbClient) throw new Error('Supabase client (db) is unavailable for PersonalityRepository');
        if (!loggerInstance) throw new Error('personalityLogger is unavailable for PersonalityRepository');
        if (!eventBusInstance) throw new Error('eventBus is unavailable for PersonalityRepository');

        console.log('[DI Repos] Instantiating PersonalityRepository...');
        const instance = new PersonalityRepository({
            db: dbClient, 
            logger: loggerInstance, 
            eventBus: eventBusInstance
        });
        console.log('[DI Repos] PersonalityRepository instantiated successfully.');
        return instance;
    }, true);
    container.register('progressRepository', c => {
        return new ProgressRepository(c.get('supabase'), c.get('progressLogger'));
    }, true);
    container.register('adaptiveRepository', c => {
        return new AdaptiveRepository({
            db: c.get('supabase'),
            logger: c.get('adaptiveLogger')
        });
    }, true);
    
    // Register the challenge repository
    container.register('challengeRepository', c => {
        return new ChallengeRepository({
            db: c.get('supabase'),
            logger: c.get('challengeLogger'),
            eventBus: c.get('eventBus')
        });
    }, true);
    
    // User-specific focus areas (stored in 'focus_areas' table)
    container.register('focusAreaRepository', c => {
        return new FocusAreaRepository({
            db: c.get('supabase'),
            logger: c.get('focusAreaLogger'),
            eventBus: c.get('eventBus'),
        });
    }, true);
    container.register('evaluationCategoryRepository', c => {
        return new EvaluationCategoryRepository({
            supabase: c.get('supabase'),
            logger: c.get('evaluationLogger')
        });
    }, true);
    container.register('evaluationRepository', c => {
        return new EvaluationRepository({
            db: c.get('supabase'),
            logger: c.get('evaluationLogger'),
            eventBus: c.get('eventBus')
        });
    }, true);
    container.register('userJourneyRepository', c => {
        return new UserJourneyRepository(c.get('supabase'), c.get('userJourneyLogger'));
    }, true);
    // Register challenge configuration repositories
    container.register('challengeTypeRepository', c => {
        return new ChallengeTypeRepository({
            db: c.get('supabase'),
            logger: c.get('challengeLogger'),
            cache: c.get('configCache')
        });
    }, true);
    container.register('formatTypeRepository', c => {
        return new FormatTypeRepository({
            db: c.get('supabase'),
            logger: c.get('challengeLogger'),
            cache: c.get('configCache')
        });
    }, true);
    // Global focus area configuration (stored in 'challenge_focus_areas' table)
    container.register('focusAreaConfigRepository', c => {
        return new FocusAreaConfigRepository(
            c.get('supabase'),
            c.get('challengeLogger'),
            c.get('configCache')
        );
    }, true);
    container.register('difficultyLevelRepository', c => {
        return new DifficultyLevelRepository({
            db: c.get('supabase'),
            logger: c.get('challengeLogger'),
            cache: c.get('configCache')
        });
    }, true);
}

export { registerRepositoryComponents };
export default {
    registerRepositoryComponents
};
