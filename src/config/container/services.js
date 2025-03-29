'use strict';

/**
 * Service Components Registration
 * 
 * This module registers all service components in the DI container.
 */

/**
 * Register service components in the container
 * @param {DIContainer} container - The DI container
 */
function registerServiceComponents(container) {
  // Register domain services
  container.register(
    'userService',
    c => {
      const UserService = require('../../core/user/services/UserService');
      return new UserService({
        userRepository: c.get('userRepository'),
        logger: c.get('logger'),
        eventBus: c.get('eventBus'),
      });
    },
    true
  );

  container.register(
    'personalityService',
    c => {
      const PersonalityService = require('../../core/personality/services/PersonalityService');
      return new PersonalityService(
        c.get('personalityRepository'),
        c.get('traitsAnalysisService'),
        c.get('personalityInsightGenerator'),
      );
    },
    true
  );

  container.register(
    'userJourneyService',
    c => {
      const UserJourneyService = require('../../core/userJourney/services/UserJourneyService');
      return new UserJourneyService({
        userJourneyRepository: c.get('userJourneyRepository'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'progressService',
    c => {
      const ProgressService = require('../../core/progress/services/ProgressService');
      return new ProgressService({
        progressRepository: c.get('progressRepository'),
        logger: c.get('logger'),
        eventBus: c.get('eventBus'),
      });
    },
    true
  );

  container.register(
    'adaptiveService',
    c => {
      const AdaptiveService = require('../../core/adaptive/services/AdaptiveService');
      return new AdaptiveService({
        adaptiveRepository: c.get('adaptiveRepository'),
        logger: c.get('logger'),
        eventBus: c.get('eventBus'),
      });
    },
    true
  );

  // Register focus area services
  container.register(
    'focusAreaService',
    c => {
      const FocusAreaService = require('../../core/focusArea/services/FocusAreaService');
      return new FocusAreaService({
        focusAreaRepository: c.get('focusAreaRepository'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('logger')
      });
    },
    true
  );

  // Challenge-related services
  container.register(
    'challengePersonalizationService',
    c => {
      const ChallengePersonalizationService = require('../../core/challenge/services/ChallengePersonalizationService');
      return new ChallengePersonalizationService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        logger: c.get('challengeLogger')
      });
    },
    true
  );

  container.register(
    'challengeConfigService',
    c => {
      const ChallengeConfigService = require('../../core/challenge/services/ChallengeConfigService');
      return new ChallengeConfigService({
        challengeTypeRepository: c.get('challengeTypeRepository'),
        formatTypeRepository: c.get('formatTypeRepository'),
        focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
        difficultyLevelRepository: c.get('difficultyLevelRepository'),
        logger: c.get('challengeLogger')
      });
    },
    true
  );

  container.register(
    'challengeService',
    c => {
      const { ChallengeService } = require('../../core/challenge/services/ChallengeService');
      return new ChallengeService({
        challengeRepository: c.get('challengeRepository'),
        logger: c.get('challengeLogger'),
      });
    },
    true
  );

  container.register(
    'evaluationService',
    c => {
      const EvaluationService = require('../../core/evaluation/services/evaluationService');
      return new EvaluationService({
        evaluationRepository: c.get('evaluationRepository'),
        evaluationCategoryRepository: c.get('evaluationCategoryRepository'),
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        eventBus: c.get('eventBus'),
        logger: c.get('evaluationLogger'),
      });
    },
    true
  );

  // AI-related services
  container.register(
    'aiChatService',
    c => {
      const AiChatService = require('../../services/ai/AiChatService');
      return new AiChatService({
        openai: c.get('openai'),
        conversationStateManager: c.get('conversationStateManager'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'aiAnalysisService',
    c => {
      const AiAnalysisService = require('../../services/ai/AiAnalysisService');
      return new AiAnalysisService({
        openai: c.get('openai'),
        logger: c.get('logger'),
      });
    },
    true
  );

  // Register PersonalityDataLoader
  container.register(
    'personalityDataLoader',
    c => {
      const PersonalityDataLoader = require('../../core/personality/services/PersonalityDataLoader');
      return new PersonalityDataLoader({
        personalityRepository: c.get('personalityRepository'),
        cacheService: c.get('cacheService'),
        logger: c.get('personalityLogger')
      });
    },
    true
  );

  // Register TraitsAnalysis Service
  container.register(
    'traitsAnalysisService',
    c => {
      const TraitsAnalysisService = require('../../core/personality/services/TraitsAnalysisService');
      return new TraitsAnalysisService({
        personalityRepository: c.get('personalityRepository'),
        logger: c.get('traitsAnalysisLogger'),
      });
    },
    true
  );

  container.register(
    'challengeGenerationService',
    c => {
      const ChallengeGenerationService = require('../../core/challenge/services/challengeGenerationService');
      return new ChallengeGenerationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('logger')
      });
    },
    true
  );

  container.register(
    'challengeEvaluationService',
    c => {
      const ChallengeEvaluationService = require('../../core/challenge/services/challengeEvaluationService');
      return new ChallengeEvaluationService({
        aiClient: c.get('aiClient'),
        aiStateManager: c.get('aiStateManager'),
        openAIConfig: c.get('openAIConfig'),
        logger: c.get('logger')
      });
    },
    true
  );

  container.register(
    'userContextService',
    c => {
      const { UserContextService } = require('../../core/evaluation/services/userContextService');
      return new UserContextService({
        userRepository: c.get('userRepository'),
        challengeRepository: c.get('challengeRepository'),
        evaluationRepository: c.get('evaluationRepository'),
        logger: c.get('evaluationLogger')
      });
    },
    true
  );
}

module.exports = registerServiceComponents; 