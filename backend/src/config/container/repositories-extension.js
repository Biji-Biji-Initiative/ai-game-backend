'use strict';

import SupabaseRivalRepository from "#app/core/rival/repositories/SupabaseRivalRepository.js";
import SupabaseBadgeRepository from "#app/core/badge/repositories/SupabaseBadgeRepository.js";
import SupabaseLeaderboardRepository from "#app/core/leaderboard/repositories/SupabaseLeaderboardRepository.js";
import SupabaseNetworkRepository from "#app/core/network/repositories/SupabaseNetworkRepository.js";
import SupabaseThreadStateRepository from "#app/core/ai/repositories/SupabaseThreadStateRepository.js";

/**
 * Register repository components in the DI container
 * @param {DIContainer} container - DI container
 * @param {Object} logger - Logger instance
 */
export function registerRepositoryComponents(container, logger) {
  logger.info('Registering repository components...');
  
  // Existing repositories registration...
  
  // Register new repositories
  
  // Thread state repository for OpenAI
  container.register('threadStateRepository', () => {
    const supabaseClient = container.get('supabaseClient');
    
    return new SupabaseThreadStateRepository({
      supabaseClient,
      logger: container.get('logger')
    });
  });
  
  // Rival repository
  container.register('rivalRepository', () => {
    const supabaseClient = container.get('supabaseClient');
    
    return new SupabaseRivalRepository({
      supabaseClient,
      logger: container.get('logger')
    });
  });
  
  // Badge repository
  container.register('badgeRepository', () => {
    const supabaseClient = container.get('supabaseClient');
    
    return new SupabaseBadgeRepository({
      supabaseClient,
      logger: container.get('logger')
    });
  });
  
  // Leaderboard repository
  container.register('leaderboardRepository', () => {
    const supabaseClient = container.get('supabaseClient');
    
    return new SupabaseLeaderboardRepository({
      supabaseClient,
      logger: container.get('logger')
    });
  });
  
  // Network repository
  container.register('networkRepository', () => {
    const supabaseClient = container.get('supabaseClient');
    
    return new SupabaseNetworkRepository({
      supabaseClient,
      logger: container.get('logger')
    });
  });
  
  logger.info('Repository components registered successfully');
}
