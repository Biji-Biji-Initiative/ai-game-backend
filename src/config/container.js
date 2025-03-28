/**
 * Dependency Injection Container Configuration
 * Registers all application services and repositories
 */
const { container } = require('../core/infra/di/DIContainer');
const config = require('./config');
const { logger } = require('../core/infra/logging/logger');
const { supabaseClient: supabase } = require('../core/infra/db/supabaseClient');

// Error handling
const AppError = require('../core/infra/errors/AppError');

// Register basic infrastructure
container.registerInstance('logger', logger);
container.registerInstance('config', config);
container.registerInstance('AppError', AppError);
container.registerInstance('supabase', supabase);

// Register domain-specific loggers
const { 
  userLogger, 
  personalityLogger, 
  challengeLogger,
  evaluationLogger,
  focusAreaLogger,
  progressLogger,
  dbLogger,
  infraLogger,
  apiLogger
} = require('../core/infra/logging/domainLogger');

container.registerInstance('userLogger', userLogger);
container.registerInstance('personalityLogger', personalityLogger);
container.registerInstance('challengeLogger', challengeLogger);
container.registerInstance('evaluationLogger', evaluationLogger);
container.registerInstance('focusAreaLogger', focusAreaLogger);
container.registerInstance('progressLogger', progressLogger);
container.registerInstance('dbLogger', dbLogger);
container.registerInstance('infraLogger', infraLogger);
container.registerInstance('apiLogger', apiLogger);

// Register event system
const { EventTypes, eventBus } = require('../core/common/events/domainEvents');
container.registerInstance('EventTypes', EventTypes);
container.registerInstance('eventBus', eventBus);

// Register OpenAI services
container.register('openAIConfig', (c) => {
  return require('../infra/openai/config');
}, true);

container.register('openAIClient', (c) => {
  const { OpenAIClient } = require('../infra/openai');
  return new OpenAIClient({
    config: c.get('openAIConfig'),
    logger: c.get('apiLogger'),
    apiKey: c.get('config').openai.apiKey
  });
}, true);

container.register('openAIResponseHandler', (c) => {
  const { OpenAIResponseHandler } = require('../lib/openai');
  return new OpenAIResponseHandler({
    logger: c.get('logger')
  });
}, true);

// Register conversation state repository and OpenAI state manager
container.register('conversationStateRepository', (c) => {
  const ConversationStateRepository = require('../infra/repositories/ConversationStateRepository');
  return new ConversationStateRepository(
    c.get('supabase'), 
    c.get('dbLogger')
  );
}, true);

container.register('openAIStateManager', (c) => {
  const { OpenAIStateManager } = require('../infra/openai');
  return new OpenAIStateManager({
    conversationStateRepository: c.get('conversationStateRepository'),
    logger: c.get('apiLogger')
  });
}, true);

// Register domain repositories
container.register('userRepository', (c) => {
  const UserRepository = require('../core/user/repositories/UserRepository');
  return new UserRepository(c.get('supabase'), c.get('logger'));
}, true);

container.register('personalityRepository', (c) => {
  const PersonalityRepository = require('../core/personality/repositories/PersonalityRepository');
  return new PersonalityRepository(c.get('supabase'), c.get('logger'));
}, true);

container.register('progressRepository', (c) => {
  const ProgressRepository = require('../core/progress/repositories/ProgressRepository');
  return new ProgressRepository(c.get('supabase'), c.get('logger'));
}, true);

container.register('adaptiveRepository', (c) => {
  const AdaptiveRepository = require('../core/adaptive/repositories/AdaptiveRepository');
  return new AdaptiveRepository(c.get('supabase'), c.get('logger'));
}, true);

container.register('challengeRepository', (c) => {
  const ChallengeRepository = require('../core/challenge/repositories/challengeRepository');
  return new ChallengeRepository(c.get('supabase'), c.get('challengeLogger'));
}, true);

container.register('focusAreaRepository', (c) => {
  const focusAreaRepository = require('../core/focusArea/repositories/focusAreaRepository');
  return focusAreaRepository;
}, true);

container.register('evaluationCategoryRepository', (c) => {
  return require('../core/evaluation/repositories/evaluationCategoryRepository');
}, true);

container.register('evaluationRepository', (c) => {
  const EvaluationRepository = require('../core/evaluation/repositories/evaluationRepository');
  return new EvaluationRepository();
}, true);

container.register('userJourneyRepository', (c) => {
  const UserJourneyRepository = require('../core/userJourney/repositories/UserJourneyRepository');
  return new UserJourneyRepository(c.get('supabase'), c.get('logger'));
}, true);

// Register challenge configuration repositories
container.register('challengeTypeRepository', (c) => {
  const { ChallengeTypeRepository } = require('../core/challenge/config');
  return new ChallengeTypeRepository(c.get('supabase'), c.get('challengeLogger'));
}, true);

container.register('formatTypeRepository', (c) => {
  const { FormatTypeRepository } = require('../core/challenge/config');
  return new FormatTypeRepository(c.get('supabase'), c.get('challengeLogger'));
}, true);

container.register('focusAreaConfigRepository', (c) => {
  const { FocusAreaRepository } = require('../core/challenge/config');
  return new FocusAreaRepository(c.get('supabase'), c.get('challengeLogger'));
}, true);

container.register('difficultyLevelRepository', (c) => {
  const { DifficultyLevelRepository } = require('../core/challenge/config');
  return new DifficultyLevelRepository(c.get('supabase'), c.get('challengeLogger'));
}, true);

// Register challenge configuration initializer
container.register('challengeConfigInitializer', (c) => {
  const { initializeChallengeConfig } = require('../core/challenge/config');
  return {
    initialize: async (shouldSeed = false) => {
      return initializeChallengeConfig(
        c.get('supabase'),
        c.get('challengeLogger'),
        shouldSeed
      );
    }
  };
}, true);

// Register domain services
container.register('userService', (c) => {
  const UserService = require('../core/user/services/UserService');
  return new UserService(c.get('userRepository'), c.get('logger'));
}, true);

container.register('challengeService', (c) => {
  const ChallengeService = require('../core/challenge/services/ChallengeService');
  return new ChallengeService({
    challengeRepository: c.get('challengeRepository'),
    logger: c.get('challengeLogger')
  });
}, true);

container.register('personalityService', (c) => {
  const PersonalityService = require('../core/personality/services/PersonalityService');
  return new PersonalityService(
    c.get('personalityRepository'), 
    c.get('openAIClient'),
    c.get('logger')
  );
}, true);

container.register('progressService', (c) => {
  const ProgressService = require('../core/progress/services/ProgressService');
  return new ProgressService(c.get('progressRepository'), c.get('logger'));
}, true);

container.register('adaptiveService', (c) => {
  const AdaptiveService = require('../core/adaptive/services/AdaptiveService');
  return new AdaptiveService({
    adaptiveRepository: c.get('adaptiveRepository'),
    logger: c.get('logger')
  });
}, true);

container.register('evaluationDomainService', (c) => {
  const EvaluationDomainService = require('../core/evaluation/services/domain/EvaluationDomainService');
  return new EvaluationDomainService({
    evaluationCategoryRepository: c.get('evaluationCategoryRepository'),
    logger: c.get('evaluationLogger')
  });
}, true);

container.register('evaluationService', (c) => {
  const EvaluationService = require('../core/evaluation/services/evaluationService');
  return new EvaluationService({
    responsesApiClient: require('../core/infra/api/responsesApiClient'),
    logger: c.get('evaluationLogger'),
    openAIStateManager: c.get('openAIStateManager'),
    evaluationDomainService: c.get('evaluationDomainService')
  });
}, true);

// Register focus area services
container.register('focusAreaThreadService', (c) => {
  const FocusAreaThreadService = require('../core/focusArea/services/focusAreaThreadService');
  return new FocusAreaThreadService({
    openAIStateManager: c.get('openAIStateManager'),
    logger: c.get('focusAreaLogger')
  });
}, true);

container.register('focusAreaGenerationService', (c) => {
  const FocusAreaGenerationService = require('../core/focusArea/services/focusAreaGenerationService');
  return new FocusAreaGenerationService({
    openAIClient: c.get('openAIClient'),
    MessageRole: c.get('openAIConfig').MessageRole,
    logger: c.get('focusAreaLogger')
  });
}, true);

// Register application-level coordinators
container.register('focusAreaCoordinator', (c) => {
  const FocusAreaCoordinator = require('../application/focusAreaCoordinator');
  return new FocusAreaCoordinator({
    userRepository: c.get('userRepository'),
    challengeRepository: c.get('challengeRepository'),
    progressRepository: c.get('progressRepository'),
    focusAreaRepository: c.get('focusAreaRepository'),
    focusAreaThreadService: c.get('focusAreaThreadService'),
    focusAreaGenerationService: c.get('focusAreaGenerationService'),
    openAIStateManager: c.get('openAIStateManager'),
    openAIClient: c.get('openAIClient'),
    eventBus: c.get('eventBus'),
    EventTypes: c.get('EventTypes'),
    logger: c.get('logger')
  });
}, true);

container.register('challengeCoordinator', (c) => {
  const ChallengeCoordinator = require('../application/challengeCoordinator');
  return new ChallengeCoordinator({
    userService: c.get('userService'),
    challengeService: c.get('challengeService'),
    challengeTypeRepository: c.get('challengeTypeRepository'),
    formatTypeRepository: c.get('formatTypeRepository'),
    focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
    difficultyLevelRepository: c.get('difficultyLevelRepository'),
    challengeGenerationService: c.get('challengeGenerationService'),
    challengeEvaluationService: c.get('challengeEvaluationService'),
    openAIClient: c.get('openAIClient'),
    openAIStateManager: c.get('openAIStateManager'),
    logger: c.get('logger')
  });
}, true);

// Register the UserJourneyService
container.register('userJourneyService', (c) => {
  const UserJourneyService = require('../core/userJourney/services/UserJourneyService');
  return new UserJourneyService();
}, true);

container.register('userJourneyCoordinator', (c) => {
  const UserJourneyCoordinator = require('../application/userJourneyCoordinator');
  return new UserJourneyCoordinator({
    userRepository: c.get('userRepository'),
    challengeRepository: c.get('challengeRepository'),
    userJourneyRepository: c.get('userJourneyRepository'),
    userJourneyService: c.get('userJourneyService'),
    logger: c.get('logger')
  });
}, true);

container.register('personalityCoordinator', (c) => {
  const PersonalityCoordinator = require('../application/PersonalityCoordinator');
  return new PersonalityCoordinator(
    c.get('userService'), 
    c.get('personalityService'),
    c.get('personalityLogger')
  );
}, true);

// Register error handling
container.register('errorHandler', (c) => {
  const { ErrorHandler } = require('../core/infra/errors/errorHandler');
  return new ErrorHandler();
}, true);

// Register the ChallengeGenerationService
container.register('challengeGenerationService', (c) => {
  const ChallengeGenerationService = require('../core/challenge/services/challengeGenerationService');
  return new ChallengeGenerationService({
    openAIClient: c.get('openAIClient'),
    openAIStateManager: c.get('openAIStateManager'),
    personalityRepository: c.get('personalityRepository'),
    openAIConfig: c.get('openAIConfig'),
    logger: c.get('challengeLogger')
  });
}, true);

// Register challengeEvaluationService
container.register('challengeEvaluationService', (c) => {
  const ChallengeEvaluationService = require('../core/challenge/services/challengeEvaluationService');
  return new ChallengeEvaluationService({
    openAIClient: c.get('openAIClient'),
    openAIStateManager: c.get('openAIStateManager'),
    openAIConfig: c.get('openAIConfig'),
    logger: c.get('challengeLogger')
  });
}, true);

// Register dynamicPromptService
container.register('dynamicPromptService', (c) => {
  const DynamicPromptService = require('../core/evaluation/services/dynamicPromptService');
  const evaluationCategoryRepository = require('../core/evaluation/repositories/evaluationCategoryRepository');
  return new DynamicPromptService({
    evaluationCategoryRepository: evaluationCategoryRepository,
    logger: c.get('evaluationLogger')
  });
}, true);

module.exports = container;
