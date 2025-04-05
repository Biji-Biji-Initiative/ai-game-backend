'use strict';

import RivalService from "#app/core/rival/services/RivalService.js";
import BadgeService from "#app/core/badge/services/BadgeService.js";
import LeaderboardService from "#app/core/leaderboard/services/LeaderboardService.js";
import NetworkService from "#app/core/network/services/NetworkService.js";
import SupabaseRivalRepository from "#app/core/rival/repositories/SupabaseRivalRepository.js";
import SupabaseBadgeRepository from "#app/core/badge/repositories/SupabaseBadgeRepository.js";
import SupabaseLeaderboardRepository from "#app/core/leaderboard/repositories/SupabaseLeaderboardRepository.js";
import SupabaseNetworkRepository from "#app/core/network/repositories/SupabaseNetworkRepository.js";
import FeaturePromptBuilders from "#app/core/prompt/builders/FeaturePromptBuilders.js";

/**
 * Register service components in the DI container
 * @param {DIContainer} container - DI container
 * @param {Object} logger - Logger instance
 */
export function registerServiceComponents(container, logger) {
  logger.info('Registering service components...');
  
  // Existing services registration...
  
  // Register new services
  
  // Feature prompt builders
  container.register('featurePromptBuilders', () => {
    return new FeaturePromptBuilders({
      config: container.get('config'),
      logger: container.get('logger')
    });
  });
  
  // Rival service
  container.register('rivalService', () => {
    const rivalRepository = container.get('rivalRepository');
    const promptService = container.get('promptService');
    const aiService = container.get('aiService');
    
    return new RivalService({
      rivalRepository,
      promptService,
      aiService,
      logger: container.get('logger')
    });
  });
  
  // Badge service
  container.register('badgeService', () => {
    const badgeRepository = container.get('badgeRepository');
    const promptService = container.get('promptService');
    
    return new BadgeService({
      badgeRepository,
      promptService,
      logger: container.get('logger')
    });
  });
  
  // Leaderboard service
  container.register('leaderboardService', () => {
    const leaderboardRepository = container.get('leaderboardRepository');
    const promptService = container.get('promptService');
    
    return new LeaderboardService({
      leaderboardRepository,
      promptService,
      logger: container.get('logger')
    });
  });
  
  // Network service
  container.register('networkService', () => {
    const networkRepository = container.get('networkRepository');
    const promptService = container.get('promptService');
    
    return new NetworkService({
      networkRepository,
      promptService,
      logger: container.get('logger')
    });
  });
  
  logger.info('Service components registered successfully');
}
