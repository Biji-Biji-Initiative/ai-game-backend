import UserRepository from "@/core/user/repositories/UserRepository.js";
import PersonalityRepository from "@/core/personality/repositories/PersonalityRepository.js";
import ProgressRepository from "@/core/progress/repositories/ProgressRepository.js";
import AdaptiveRepository from "@/core/adaptive/repositories/AdaptiveRepository.js";
import ChallengeRepository from "@/core/challenge/repositories/challengeRepository.js";
import FocusAreaRepository from "@/core/focusArea/repositories/focusAreaRepository.js";
import EvaluationCategoryRepository from "@/core/evaluation/repositories/evaluationCategoryRepository.js";
import EvaluationRepository from "@/core/evaluation/repositories/evaluationRepository.js";
import UserJourneyRepository from "@/core/userJourney/repositories/UserJourneyRepository.js";
import ChallengeTypeRepository from "@/core/challenge/repositories/config/ChallengeTypeRepository.js";
import FormatTypeRepository from "@/core/challenge/repositories/config/FormatTypeRepository.js";
import { FocusAreaConfigRepository } from "@/core/challenge/repositories/config/FocusAreaConfigRepository.js";
import DifficultyLevelRepository from "@/core/challenge/repositories/config/DifficultyLevelRepository.js";
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
        return new PersonalityRepository(c.get('supabase'), c.get('personalityLogger'));
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
