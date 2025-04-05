// Export all stores
export { useGameStore, GamePhase, useIsPhaseCompleted } from './useGameStore';
export { useUserPreferencesStore } from './user-preferences-store';

// Export types for game state
export type {
  Trait,
  FocusArea,
  RoundResponse,
  Profile,
  AiAttitude,
  AiInsight,
  Challenge
} from './useGameStore';
