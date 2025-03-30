import UserRepository from "../../core/user/repositories/UserRepository.js";
import PersonalityRepository from "../../core/personality/repositories/PersonalityRepository.js";
import ProgressRepository from "../../core/progress/repositories/ProgressRepository.js";
import AdaptiveRepository from "../../core/adaptive/repositories/AdaptiveRepository.js";
import { ChallengeRepositoryWrapper } from "../../core/challenge/repositories/ChallengeRepositoryWrapper.js";
import FocusAreaRepository from "../../core/focusArea/repositories/focusAreaRepository.js";
import EvaluationCategoryRepository from "../../core/evaluation/repositories/evaluationCategoryRepository.js";
import EvaluationRepository from "../../core/evaluation/repositories/evaluationRepository.js";
import UserJourneyRepository from "../../core/userJourney/repositories/UserJourneyRepository.js";
import ChallengeTypeRepository from "../../core/challenge/repositories/config/ChallengeTypeRepository.js";
import FormatTypeRepository from "../../core/challenge/repositories/config/FormatTypeRepository.js";
import FocusAreaConfigRepository from "../../core/challenge/repositories/config/FocusAreaConfigRepository.js";
import DifficultyLevelRepository from "../../core/challenge/repositories/config/DifficultyLevelRepository.js";
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
        return new UserRepository(c.get('supabase'), c.get('logger'));
    }, true);
    container.register('personalityRepository', c => {
        return new PersonalityRepository(c.get('supabase'), c.get('logger'));
    }, true);
    container.register('progressRepository', c => {
        return new ProgressRepository(c.get('supabase'), c.get('logger'));
    }, true);
    container.register('adaptiveRepository', c => {
        return new AdaptiveRepository(c.get('supabase'), c.get('logger'));
    }, true);
    
    // Register the challenge repository
    container.register('challengeRepository', c => {
        return new ChallengeRepositoryWrapper({
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
        return new EvaluationCategoryRepository(c.get('supabase'), c.get('evaluationLogger'));
    }, true);
    container.register('evaluationRepository', c => {
        return new EvaluationRepository(c.get('supabase'), c.get('evaluationLogger'));
    }, true);
    container.register('userJourneyRepository', c => {
        return new UserJourneyRepository(c.get('supabase'), c.get('logger'));
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
        return new FocusAreaConfigRepository({
            db: c.get('supabase'),
            logger: c.get('challengeLogger'),
            cache: c.get('configCache')
        });
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
