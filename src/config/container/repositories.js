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
  container.register(
    'userRepository',
    c => {
      const UserRepository = require('../../core/user/repositories/UserRepository');
      return new UserRepository(c.get('supabase'), c.get('logger'));
    },
    true
  );

  container.register(
    'personalityRepository',
    c => {
      const PersonalityRepository = require('../../core/personality/repositories/PersonalityRepository');
      return new PersonalityRepository(c.get('supabase'), c.get('logger'));
    },
    true
  );

  container.register(
    'progressRepository',
    c => {
      const ProgressRepository = require('../../core/progress/repositories/ProgressRepository');
      return new ProgressRepository(c.get('supabase'), c.get('logger'));
    },
    true
  );

  container.register(
    'adaptiveRepository',
    c => {
      const AdaptiveRepository = require('../../core/adaptive/repositories/AdaptiveRepository');
      return new AdaptiveRepository(c.get('supabase'), c.get('logger'));
    },
    true
  );

  container.register(
    'challengeRepository',
    c => {
      const ChallengeRepository = require('../../core/challenge/repositories/ChallengeRepository');
      return new ChallengeRepository(c.get('supabase'), c.get('challengeLogger'));
    },
    true
  );

  // User-specific focus areas (stored in 'focus_areas' table)
  container.register(
    'focusAreaRepository',
    c => {
      const { FocusAreaRepository } = require('../../core/focusArea/repositories/focusAreaRepository');
      return new FocusAreaRepository({
        db: c.get('supabase'),
        logger: c.get('focusAreaLogger'),
        eventBus: c.get('eventBus'),
      });
    },
    true
  );

  container.register(
    'evaluationCategoryRepository',
    c => {
      const EvaluationCategoryRepository = require('../../core/evaluation/repositories/evaluationCategoryRepository');
      return new EvaluationCategoryRepository(c.get('supabase'), c.get('evaluationLogger'));
    },
    true
  );

  container.register(
    'evaluationRepository',
    c => {
      const EvaluationRepository = require('../../core/evaluation/repositories/evaluationRepository');
      return new EvaluationRepository(c.get('supabase'), c.get('evaluationLogger'));
    },
    true
  );

  container.register(
    'userJourneyRepository',
    c => {
      const UserJourneyRepository = require('../../core/userJourney/repositories/UserJourneyRepository');
      return new UserJourneyRepository(c.get('supabase'), c.get('logger'));
    },
    true
  );

  // Register challenge configuration repositories
  container.register(
    'challengeTypeRepository',
    c => {
      const { ChallengeTypeRepository } = require('../../core/challenge/config');
      return new ChallengeTypeRepository(
        c.get('supabase'),
        c.get('challengeLogger'),
        c.get('configCache')
      );
    },
    true
  );

  container.register(
    'formatTypeRepository',
    c => {
      const { FormatTypeRepository } = require('../../core/challenge/config');
      return new FormatTypeRepository(
        c.get('supabase'),
        c.get('challengeLogger'),
        c.get('configCache')
      );
    },
    true
  );

  // Global focus area configuration (stored in 'challenge_focus_areas' table)
  container.register(
    'focusAreaConfigRepository',
    c => {
      const { FocusAreaConfigRepository } = require('../../core/challenge/config');
      return new FocusAreaConfigRepository(
        c.get('supabase'),
        c.get('challengeLogger'),
        c.get('configCache')
      );
    },
    true
  );

  container.register(
    'difficultyLevelRepository',
    c => {
      const { DifficultyLevelRepository } = require('../../core/challenge/config');
      return new DifficultyLevelRepository(
        c.get('supabase'),
        c.get('challengeLogger'),
        c.get('configCache')
      );
    },
    true
  );
}

module.exports = registerRepositoryComponents; 