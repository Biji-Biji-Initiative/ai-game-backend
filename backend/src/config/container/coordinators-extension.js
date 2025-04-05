'use strict';

import RivalCoordinator from "#app/application/rival/RivalCoordinator.js";
import BadgeCoordinator from "#app/application/badge/BadgeCoordinator.js";
import LeaderboardCoordinator from "#app/application/leaderboard/LeaderboardCoordinator.js";
import NetworkCoordinator from "#app/application/network/NetworkCoordinator.js";

/**
 * Register coordinator components in the DI container
 * @param {DIContainer} container - DI container
 * @param {Object} logger - Logger instance
 */
export function registerCoordinatorComponents(container, logger) {
  logger.info('Registering coordinator components...');
  
  // Existing coordinators registration...
  
  // Register new coordinators
  
  // Rival coordinator
  container.register('rivalCoordinator', () => {
    const rivalService = container.get('rivalService');
    const userService = container.get('userService');
    const personalityService = container.get('personalityService');
    const promptService = container.get('promptService');
    const challengeService = container.get('challengeService');
    
    return new RivalCoordinator({
      rivalService,
      userService,
      personalityService,
      promptService,
      challengeService,
      logger: container.get('logger')
    });
  });
  
  // Badge coordinator
  container.register('badgeCoordinator', () => {
    const badgeService = container.get('badgeService');
    const userService = container.get('userService');
    const progressService = container.get('progressService');
    const promptService = container.get('promptService');
    
    return new BadgeCoordinator({
      badgeService,
      userService,
      progressService,
      promptService,
      logger: container.get('logger')
    });
  });
  
  // Leaderboard coordinator
  container.register('leaderboardCoordinator', () => {
    const leaderboardService = container.get('leaderboardService');
    const userService = container.get('userService');
    const challengeService = container.get('challengeService');
    const promptService = container.get('promptService');
    
    return new LeaderboardCoordinator({
      leaderboardService,
      userService,
      challengeService,
      promptService,
      logger: container.get('logger')
    });
  });
  
  // Network coordinator
  container.register('networkCoordinator', () => {
    const networkService = container.get('networkService');
    const userService = container.get('userService');
    const progressService = container.get('progressService');
    const rivalService = container.get('rivalService');
    const promptService = container.get('promptService');
    
    return new NetworkCoordinator({
      networkService,
      userService,
      progressService,
      rivalService,
      promptService,
      logger: container.get('logger')
    });
  });
  
  logger.info('Coordinator components registered successfully');
}
