import ChallengeType from "#app/core/challenge/models/config/ChallengeType.js";
import FormatType from "#app/core/challenge/models/config/FormatType.js";
import FocusArea from "#app/core/challenge/models/config/FocusArea.js";
import DifficultyLevel from "#app/core/challenge/models/config/DifficultyLevel.js";
import ChallengeTypeRepository from "#app/core/challenge/repositories/config/ChallengeTypeRepository.js";
import FormatTypeRepository from "#app/core/challenge/repositories/config/FormatTypeRepository.js";
import { FocusAreaConfigRepository } from "#app/core/challenge/repositories/config/FocusAreaConfigRepository.js";
import DifficultyLevelRepository from "#app/core/challenge/repositories/config/DifficultyLevelRepository.js";
import seedData from "#app/core/challenge/config/seedData.js";
'use strict';
/**
 * Initialize challenge configuration tables in the database
 * @param {Object} container - The DI container instance
 * @param {Object} logger - Logger instance
 * @param {boolean} shouldSeed - Whether to seed the database with initial data
 * @returns {Promise<Object>} Configuration repositories
 */
async function initializeChallengeConfig(container, logger, shouldSeed = false) {
    try {
        // Get repositories from the DI container
        const challengeTypeRepo = await container.getAsync('challengeTypeRepository');
        const formatTypeRepo = await container.getAsync('formatTypeRepository');
        const focusAreaRepo = await container.getAsync('focusAreaConfigRepository');
        const difficultyLevelRepo = await container.getAsync('difficultyLevelRepository');

        // Validate that repositories were retrieved
        if (!challengeTypeRepo || !formatTypeRepo || !focusAreaRepo || !difficultyLevelRepo) {
             logger.error('Failed to retrieve one or more challenge config repositories from DI container');
             throw new Error('DI container failed to provide necessary config repositories');
        }

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
            focusAreaConfigRepository: focusAreaRepo,
            difficultyLevelRepository: difficultyLevelRepo,
        };
    }
    catch (error) {
        logger.error('Failed to initialize challenge configuration', { error: error.message });
        throw error;
    }
}
export { ChallengeType };
export { FormatType };
export { FocusArea };
export { DifficultyLevel };
export { ChallengeTypeRepository };
export { FormatTypeRepository };
export { FocusAreaConfigRepository };
export { DifficultyLevelRepository };
export { initializeChallengeConfig };
export { seedData };
export default {
    ChallengeType,
    FormatType,
    FocusArea,
    DifficultyLevel,
    ChallengeTypeRepository,
    FormatTypeRepository,
    FocusAreaConfigRepository,
    DifficultyLevelRepository,
    initializeChallengeConfig,
    seedData
};
