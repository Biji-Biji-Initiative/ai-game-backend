/**
 * Challenge DTOs Index File
 * 
 * This file exports all Challenge-related DTOs and mappers from a single entry point.
 * Use this file for importing Challenge DTOs to avoid circular dependencies.
 */

export { ChallengeDTO, ChallengeResponseDTO, ChallengeDTOMapper } from './ChallengeDTO.js';
export { DifficultyLevelDTO } from './DifficultyLevelDTO.js';
export { FormatTypeDTO } from './FormatTypeDTO.js';
export { ChallengeTypeDTO } from './ChallengeTypeDTO.js';
export { FocusAreaConfigDTO } from './FocusAreaConfigDTO.js';

// Default export for backward compatibility
export default {
  ChallengeDTO: ChallengeDTO,
  ChallengeResponseDTO: ChallengeResponseDTO,
  ChallengeDTOMapper: ChallengeDTOMapper,
  DifficultyLevelDTO: DifficultyLevelDTO,
  FormatTypeDTO: FormatTypeDTO,
  ChallengeTypeDTO: ChallengeTypeDTO,
  FocusAreaConfigDTO: FocusAreaConfigDTO
}; 