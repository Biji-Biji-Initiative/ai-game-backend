/**
 * Standard Domain Event Types
 * 
 * Centralized definition of standard event type constants used across the application.
 * Moved here to break circular dependency between domainEvents, RobustEventBus, and eventUtils.
 */

'use strict';

const EventTypes = {
  // User domain events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PROFILE_COMPLETED: 'user.profile.completed',
  // Challenge domain events
  CHALLENGE_CREATED: 'challenge.created',
  CHALLENGE_COMPLETED: 'challenge.completed',
  CHALLENGE_EVALUATED: 'challenge.evaluated',
  // Evaluation domain events
  EVALUATION_CREATED: 'evaluation.created',
  EVALUATION_UPDATED: 'evaluation.updated',
  // Progress domain events
  PROGRESS_UPDATED: 'progress.updated',
  PROGRESS_MILESTONE_REACHED: 'progress.milestone.reached',
  // Personality domain events
  PERSONALITY_UPDATED: 'personality.updated',
  PERSONALITY_INSIGHT_GENERATED: 'personality.insight.generated',
  // Focus area domain events
  FOCUS_AREA_SELECTED: 'focus_area.selected',
  FOCUS_AREA_COMPLETED: 'focus_area.completed',
  // User journey domain events
  USER_JOURNEY_EVENT_RECORDED: 'user_journey.event.recorded',
  USER_JOURNEY_MILESTONE_REACHED: 'user_journey.milestone.reached',
  // Adaptive system events
  ADAPTIVE_RECOMMENDATION_GENERATED: 'adaptive.recommendation.generated',
  DIFFICULTY_ADJUSTED: 'adaptive.difficulty.adjusted'
};

export { EventTypes };
export default EventTypes; 