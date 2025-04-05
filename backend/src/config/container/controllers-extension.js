'use strict';

import RivalController from "#app/core/rival/controllers/RivalController.js";
import BadgeController from "#app/core/badge/controllers/BadgeController.js";
import LeaderboardController from "#app/core/leaderboard/controllers/LeaderboardController.js";
import NetworkController from "#app/core/network/controllers/NetworkController.js";
import RivalCoordinator from "#app/application/rival/RivalCoordinator.js";
import BadgeCoordinator from "#app/application/badge/BadgeCoordinator.js";
import LeaderboardCoordinator from "#app/application/leaderboard/LeaderboardCoordinator.js";
import NetworkCoordinator from "#app/application/network/NetworkCoordinator.js";

/**
 * Register controller components in the DI container
 * @param {DIContainer} container - DI container
 * @param {Object} logger - Logger instance
 */
export function registerControllerComponents(container, logger) {
  logger.info('Registering controller components...');
  
  // Existing controllers registration...
  
  // Register new controllers
  
  // Rival controller
  container.register('rivalController', () => {
    const rivalCoordinator = container.get('rivalCoordinator');
    return new RivalController({ rivalCoordinator });
  });
  
  // Badge controller
  container.register('badgeController', () => {
    const badgeCoordinator = container.get('badgeCoordinator');
    return new BadgeController({ badgeCoordinator });
  });
  
  // Leaderboard controller
  container.register('leaderboardController', () => {
    const leaderboardCoordinator = container.get('leaderboardCoordinator');
    return new LeaderboardController({ leaderboardCoordinator });
  });
  
  // Network controller
  container.register('networkController', () => {
    const networkCoordinator = container.get('networkCoordinator');
    return new NetworkController({ networkCoordinator });
  });
  
  logger.info('Controller components registered successfully');
}
