/**
 * Challenge Configuration
 * 
 * Index file that exports all challenge configuration models and repositories.
 * Provides a single entry point for accessing challenge configuration.
 */

// Models
const ChallengeType = require('../models/config/ChallengeType');
const FormatType = require('../models/config/FormatType');
const FocusArea = require('../models/config/FocusArea');
const DifficultyLevel = require('../models/config/DifficultyLevel');

// Repositories
const ChallengeTypeRepository = require('../repositories/config/ChallengeTypeRepository');
const FormatTypeRepository = require('../repositories/config/FormatTypeRepository');
const FocusAreaRepository = require('../repositories/config/FocusAreaRepository');
const DifficultyLevelRepository = require('../repositories/config/DifficultyLevelRepository');

// Seed data for bootstrapping development
const seedData = require('./seedData');

/**
 * Initialize challenge configuration tables in the database
 * @param {Object} supabase - Supabase client
 * @param {Object} logger - Logger instance
 * @param {boolean} shouldSeed - Whether to seed the database with initial data
 * @returns {Promise<Object>} Configuration repositories
 */
async function initializeChallengeConfig(supabase, logger, shouldSeed = false) {
  try {
    // Create repositories
    const challengeTypeRepo = new ChallengeTypeRepository(supabase, logger);
    const formatTypeRepo = new FormatTypeRepository(supabase, logger);
    const focusAreaRepo = new FocusAreaRepository(supabase, logger);
    const difficultyLevelRepo = new DifficultyLevelRepository(supabase, logger);
    
    // Seed the database if requested
    if (shouldSeed) {
      // Check if tables are empty first to avoid duplicate data
      const types = await challengeTypeRepo.findAll();
      const formats = await formatTypeRepo.findAll();
      const areas = await focusAreaRepo.findAll();
      const levels = await difficultyLevelRepo.findAll();
      
      if (types.length === 0) {
        logger.info('Seeding challenge types...');
        await challengeTypeRepo.seed(seedData.challengeTypes);
      }
      
      if (formats.length === 0) {
        logger.info('Seeding format types...');
        await formatTypeRepo.seed(seedData.formatTypes);
      }
      
      if (areas.length === 0) {
        logger.info('Seeding focus areas...');
        await focusAreaRepo.seed(seedData.focusAreas);
      }
      
      if (levels.length === 0) {
        logger.info('Seeding difficulty levels...');
        await difficultyLevelRepo.seed(seedData.difficultyLevels);
      }
    }
    
    return {
      challengeTypeRepository: challengeTypeRepo,
      formatTypeRepository: formatTypeRepo,
      focusAreaRepository: focusAreaRepo,
      difficultyLevelRepository: difficultyLevelRepo
    };
  } catch (error) {
    logger.error('Failed to initialize challenge configuration', { error: error.message });
    throw error;
  }
}

module.exports = {
  // Models
  ChallengeType,
  FormatType,
  FocusArea,
  DifficultyLevel,
  
  // Repositories
  ChallengeTypeRepository,
  FormatTypeRepository,
  FocusAreaRepository,
  DifficultyLevelRepository,
  
  // Initialization function
  initializeChallengeConfig,
  
  // Seed data for direct access
  seedData
}; 