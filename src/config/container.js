/**
 * Dependency Injection Container Configuration
 * Registers all application services and repositories
 */
const { container } = require('../core/infra/di/DIContainer');
const config = require('./config');
const { logger } = require('../core/infra/logging/logger');
const OpenAI = require('openai');

// Error handling
const AppError = require('../core/infra/errors/AppError');

// Dynamic prompt builders
// Note: These will be migrated to proper domain services in the future
const { buildChallengePrompt, buildEvaluationPrompt } = require('../core/prompt/dynamicPromptBuilder');
const { getFallbackChallenge } = require('../core/common/fallbackChallenges');

// Register OpenAI client as a singleton
container.register('openaiClient', () => {
  return new OpenAI({
    apiKey: config.openai.apiKey,
  });
}, true);

// Register prompt builder (assuming this exists or will be implemented)
container.register('promptBuilder', (c) => {
  return require('../core/prompt/promptBuilder');
}, true);

// Register basic utilities
container.registerInstance('logger', logger);
container.registerInstance('config', config);
container.registerInstance('AppError', AppError);
container.registerInstance('buildChallengePrompt', buildChallengePrompt);
container.registerInstance('buildEvaluationPrompt', buildEvaluationPrompt);
container.registerInstance('getFallbackChallenge', getFallbackChallenge);

// Register conversation manager for stateful conversations
container.register('conversationManager', (c) => {
  return require('../utils/conversationManager');
}, true);

// Register the entire errorHandler module
container.register('errorHandler', (c) => {
  return require('../core/infra/errors/errorHandler');
}, true);

// Register repositories from core domain models
container.register('userRepository', (c) => {
  const UserRepository = require('../core/user/repositories/UserRepository');
  return new UserRepository();
}, true);

container.register('personalityRepository', (c) => {
  const PersonalityRepository = require('../core/personality/repositories/PersonalityRepository');
  return new PersonalityRepository();
}, true);

container.register('progressRepository', (c) => {
  const ProgressRepository = require('../core/progress/repositories/ProgressRepository');
  return new ProgressRepository();
}, true);

container.register('adaptiveRepository', (c) => {
  const AdaptiveRepository = require('../core/adaptive/repositories/AdaptiveRepository');
  return new AdaptiveRepository();
}, true);

container.register('challengeRepository', (c) => {
  const ChallengeRepository = require('../core/challenge/repositories/challengeRepository');
  return new ChallengeRepository();
}, true);

container.register('focusAreaRepository', (c) => {
  const FocusAreaRepository = require('../core/focusArea/repositories/focusAreaRepository');
  return new FocusAreaRepository();
}, true);

container.register('evaluationRepository', (c) => {
  const EvaluationRepository = require('../core/evaluation/repositories/evaluationRepository');
  return new EvaluationRepository();
}, true);

container.register('userJourneyRepository', (c) => {
  const UserJourneyRepository = require('../core/userJourney/repositories/UserJourneyRepository');
  return UserJourneyRepository;
}, true);

container.register('challengeTypeRepository', (c) => {
  const ChallengeTypeRepository = require('../core/challenge/repositories/ChallengeTypeRepository');
  return new ChallengeTypeRepository();
}, true);

// Register core domain services
container.register('openaiService', (c) => {
  const openai = require('../lib/openai');
  return openai;
}, true);

container.register('userService', (c) => {
  const UserService = require('../core/user/services/UserService');
  const userRepository = c.get('userRepository');
  return new UserService(userRepository);
}, true);

container.register('personalityService', (c) => {
  const PersonalityService = require('../core/personality/services/PersonalityService');
  const personalityRepository = c.get('personalityRepository');
  const promptBuilder = c.get('promptBuilder');
  const openaiClient = c.get('openaiClient');
  return new PersonalityService(personalityRepository, promptBuilder, openaiClient);
}, true);

container.register('progressService', (c) => {
  const ProgressService = require('../core/progress/services/ProgressService');
  const progressRepository = c.get('progressRepository');
  return new ProgressService(progressRepository);
}, true);

container.register('adaptiveService', (c) => {
  const AdaptiveService = require('../core/adaptive/services/AdaptiveService');
  const adaptiveRepository = c.get('adaptiveRepository');
  const userRepository = c.get('userRepository');
  const challengeRepository = c.get('challengeRepository');
  const progressService = c.get('progressService');
  const focusAreaCoordinator = c.get('focusAreaCoordinator');
  return new AdaptiveService(
    adaptiveRepository,
    userRepository,
    challengeRepository,
    progressService,
    focusAreaCoordinator
  );
}, true);

container.register('challengeGenerationService', (c) => {
  const ChallengeGenerationService = require('../core/challenge/services/challengeGenerationService');
  const challengeRepository = c.get('challengeRepository');
  const openaiClient = c.get('openaiClient');
  return ChallengeGenerationService;
}, true);

container.register('challengeEvaluationService', (c) => {
  const ChallengeEvaluationService = require('../core/challenge/services/challengeEvaluationService');
  const challengeRepository = c.get('challengeRepository');
  const openaiClient = c.get('openaiClient');
  return ChallengeEvaluationService;
}, true);

container.register('focusAreaGenerationService', (c) => {
  const FocusAreaGenerationService = require('../core/focusArea/services/focusAreaGenerationService');
  return FocusAreaGenerationService;
}, true);

container.register('evaluationService', (c) => {
  const EvaluationService = require('../core/evaluation/services/evaluationService');
  const evaluationRepository = c.get('evaluationRepository');
  const challengeRepository = c.get('challengeRepository');
  const openaiClient = c.get('openaiClient');
  return new EvaluationService(evaluationRepository, challengeRepository, openaiClient);
}, true);

// Application-level coordinators (renamed from services)
container.register('challengeCoordinator', (c) => {
  return require('../application/challengeCoordinator');
}, true);

container.register('focusAreaCoordinator', (c) => {
  return require('../application/focusAreaCoordinator');
}, true);

container.register('userJourneyCoordinator', (c) => {
  return require('../application/userJourneyCoordinator');
}, true);

// Remove any lingering legacy registrations
container.register('progressTrackingService', (c) => {
  const ProgressService = require('../core/progress/services/ProgressService');
  const progressRepository = c.get('progressRepository');
  const userJourneyCoordinator = c.get('userJourneyCoordinator');
  return new ProgressService(progressRepository, userJourneyCoordinator);
}, true);

// Register ChallengeUtils from core
container.register('challengeUtils', (c) => {
  const ChallengeUtils = require('../core/challenge/services/ChallengeUtils');
  const challengeTypeRepository = c.get('challengeTypeRepository');
  return new ChallengeUtils(challengeTypeRepository);
}, true);

// Register ChallengePerformanceService from core
container.register('performanceMetrics', (c) => {
  const ChallengePerformanceService = require('../core/challenge/services/ChallengePerformanceService');
  const challengeRepository = c.get('challengeRepository');
  return new ChallengePerformanceService(challengeRepository);
}, true);

// Register UserTraitsService from core
container.register('traitUtils', (c) => {
  const UserTraitsService = require('../core/user/services/UserTraitsService');
  const userRepository = c.get('userRepository');
  return new UserTraitsService(userRepository);
}, true);

module.exports = container;
