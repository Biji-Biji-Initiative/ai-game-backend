/**
 * API Services Index
 * 
 * Exports all API service hooks
 */

export * from './traitsService';
export * from './focusService';

// Import and re-export specific members from challengeService, excluding Challenge
export {
  useChallenges as useGetChallenges,
  useChallenge as useGetChallengeById,
  useGenerateChallenge,
  useSubmitResponse,
  useGetAIResponse,
} from './challengeService';

// Export the types using export type syntax for isolatedModules compatibility
export type { 
  Challenge,
  ResponseSubmissionResult,
  AIResponse 
} from './challengeService';

// Export the Challenge type from challengeService with an alias
export type { Challenge as ApiChallenge } from './challengeService';

export * from './profileService';
export * from './sessionService';
export * from './fightCardService';
export * from './gameService';
export * from './aiAttitudesService';
export * from './authService';
export * from './progressService';

// Import and explicitly re-export to avoid ambiguity with progressService exports
export { 
  useGetUserJourneyEvents as useGetUserJourneyEventsFromJourneyService,
} from './userJourneyService';

export type {
  UserJourneyEvent as UserJourneyEventFromJourneyService 
} from './userJourneyService';

export * from './adaptiveService';
export * from './personalityService';
export * from './leaderboardService';
export * from './badgeService';
export * from './userService';
