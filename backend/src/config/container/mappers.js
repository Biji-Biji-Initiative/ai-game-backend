'use strict';

// Import DTO mappers
import PersonalityDTOMapper from "#app/application/personality/mappers/PersonalityDTOMapper.js";
// Remove import for PersonalityProfileDTOMapper
// import PersonalityProfileDTOMapper from "#app/application/personality/mappers/PersonalityProfileDTOMapper.js";
import UserProfileDTOMapper from "#app/application/user/mappers/UserProfileDTOMapper.js";

/**
 * DTO Mapper Registration
 *
 * This module registers data transfer object (DTO) mappers in the DI container.
 * These mappers are used to convert between domain objects and DTOs for API responses.
 */

/**
 * Register DTO mappers in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance
 */
function registerMapperComponents(container, logger) {
    // Use passed-in logger or fallback
    const mapperLogger = logger || container.get('logger').child({ context: 'DI-Mappers' });
    mapperLogger.info('Starting DTO mapper registration...');

    // Personality mappers
    mapperLogger.info('Registering personalityDTOMapper...');
    container.registerInstance('personalityDTOMapper', PersonalityDTOMapper);

    // Remove registration for personalityProfileDTOMapper
    // mapperLogger.info('Registering personalityProfileDTOMapper...');
    // container.registerInstance('personalityProfileDTOMapper', PersonalityProfileDTOMapper);
    
    // User mappers
    mapperLogger.info('Registering userProfileDTOMapper...');
    container.registerInstance('userProfileDTOMapper', UserProfileDTOMapper);

    mapperLogger.info('DTO mapper registration complete.');
}

export { registerMapperComponents };
export default {
    registerMapperComponents
}; 