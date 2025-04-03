import { UserJourney, ENGAGEMENT_LEVELS, USER_JOURNEY_PHASES } from "#app/core/userJourney/models/UserJourney.js";
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import { UserJourneyValidationError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { v4 as uuidv4 } from "uuid";

// Mock EventTypes if needed
const mockEventTypes = {
    USER_JOURNEY_UPDATED: 'UserJourneyUpdated',
    CHALLENGE_COMPLETED: 'ChallengeCompleted',
    USER_LOGGED_IN: 'UserLoggedIn'
};

describe('UserJourney Model', () => {
    // Test data
    const userId = uuidv4();
    const challengeId = uuidv4();
    
    // Helper to create dates in the past
    const daysAgo = (days) => {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    };
    
    describe('Constructor', () => {
        test('should create a new UserJourney with default values', () => {
            const journey = new UserJourney({ userId }, { EventTypes: mockEventTypes });
            
            expect(journey.id).toBeDefined();
            expect(journey.userId).toBe(userId);
            expect(journey.events).toEqual([]);
            expect(journey.lastActivity).toBeNull();
            expect(journey.sessionCount).toBe(0);
            expect(journey.currentSessionStartedAt).toBeNull();
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.NEW);
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.ONBOARDING);
            expect(journey.metrics).toEqual({
                totalChallenges: 0,
                averageScore: 0,
                streakDays: 0,
                lastChallenge: null
            });
            expect(journey.metadata).toEqual({});
            expect(journey.createdAt).toBeInstanceOf(Date);
            expect(journey.updatedAt).toBeInstanceOf(Date);
        });
        
        test('should throw error if userId is missing', () => {
            expect(() => new UserJourney({})).toThrow(UserJourneyValidationError);
        });
        
        test('should create UserJourney with provided data', () => {
            const lastActivity = new Date();
            const sessionStartTime = new Date();
            const metrics = { totalChallenges: 5, averageScore: 85, streakDays: 3, lastChallenge: new Date() };
            
            const journey = new UserJourney({
                id: 'test-id',
                userId,
                lastActivity,
                sessionCount: 3,
                currentSessionStartedAt: sessionStartTime,
                engagementLevel: ENGAGEMENT_LEVELS.ACTIVE,
                currentPhase: USER_JOURNEY_PHASES.EXPLORER,
                metrics,
                metadata: { preferences: { difficulty: 'hard' } }
            });
            
            expect(journey.id).toBe('test-id');
            expect(journey.userId).toBe(userId);
            expect(journey.lastActivity).toEqual(lastActivity);
            expect(journey.sessionCount).toBe(3);
            expect(journey.currentSessionStartedAt).toEqual(sessionStartTime);
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.ACTIVE);
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.EXPLORER);
            expect(journey.metrics).toEqual(metrics);
            expect(journey.metadata).toEqual({ preferences: { difficulty: 'hard' } });
        });
        
        test('should convert events to UserJourneyEvent instances', () => {
            const eventData = {
                id: 'event-id',
                userId,
                eventType: 'UserLoggedIn',
                timestamp: new Date(),
                eventData: { device: 'mobile' }
            };
            
            const journey = new UserJourney({
                userId,
                events: [eventData]
            });
            
            expect(journey.events).toHaveLength(1);
            expect(journey.events[0]).toBeInstanceOf(UserJourneyEvent);
            expect(journey.events[0].id).toBe('event-id');
            expect(journey.events[0].eventType).toBe('UserLoggedIn');
        });
    });
    
    describe('addEvent', () => {
        test('should add event to the journey and update state', () => {
            const journey = new UserJourney({ userId }, { EventTypes: mockEventTypes });
            const event = new UserJourneyEvent({
                userId,
                eventType: 'UserLoggedIn',
                eventData: { device: 'desktop' }
            });
            
            journey.addEvent(event, { config: { userJourney: { sessionTimeoutMinutes: 30 } } });
            
            expect(journey.events).toHaveLength(1);
            expect(journey.events[0]).toBe(event);
            expect(journey.lastActivity).toEqual(event.timestamp);
            expect(journey.sessionCount).toBe(1);
            expect(journey.currentSessionStartedAt).toEqual(event.timestamp);
            expect(journey.getDomainEvents()).toHaveLength(1); // Should add USER_JOURNEY_UPDATED event
        });
        
        test('should throw error if event userId does not match journey userId', () => {
            const journey = new UserJourney({ userId });
            const event = new UserJourneyEvent({
                userId: 'different-user-id',
                eventType: 'UserLoggedIn'
            });
            
            expect(() => journey.addEvent(event)).toThrow(UserJourneyValidationError);
        });
        
        test('should create new session if timeout has occurred', () => {
            const journey = new UserJourney({
                userId,
                lastActivity: daysAgo(1),
                sessionCount: 1,
                currentSessionStartedAt: daysAgo(1)
            });
            
            const event = new UserJourneyEvent({
                userId,
                eventType: 'UserLoggedIn',
                timestamp: new Date()
            });
            
            journey.addEvent(event, { config: { userJourney: { sessionTimeoutMinutes: 30 } } });
            
            expect(journey.sessionCount).toBe(2); // Incremented
            expect(journey.currentSessionStartedAt).toEqual(event.timestamp); // Reset
        });
        
        test('should update metrics when adding a challenge completion event', () => {
            const journey = new UserJourney({ userId });
            
            const event = new UserJourneyEvent({
                userId,
                eventType: mockEventTypes.CHALLENGE_COMPLETED,
                challengeId,
                eventData: { score: 75 }
            });
            
            journey.addEvent(event);
            
            expect(journey.metrics.totalChallenges).toBe(1);
            expect(journey.metrics.averageScore).toBe(75);
            expect(journey.metrics.lastChallenge).toBeDefined();
        });
    });
    
    describe('_calculateEngagementLevel', () => {
        test('should set NEW level for no activity', () => {
            const journey = new UserJourney({ userId });
            
            journey._calculateEngagementLevel();
            
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.NEW);
        });
        
        test('should set ACTIVE level for recent activity (less than 2 days)', () => {
            const journey = new UserJourney({
                userId,
                lastActivity: daysAgo(1)
            });
            
            journey._calculateEngagementLevel();
            
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.ACTIVE);
        });
        
        test('should set ENGAGED level for activity within 7 days', () => {
            const journey = new UserJourney({
                userId,
                lastActivity: daysAgo(5)
            });
            
            journey._calculateEngagementLevel();
            
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.ENGAGED);
        });
        
        test('should set CASUAL level for activity within 30 days', () => {
            const journey = new UserJourney({
                userId,
                lastActivity: daysAgo(15)
            });
            
            journey._calculateEngagementLevel();
            
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.CASUAL);
        });
        
        test('should set INACTIVE level for activity older than 30 days', () => {
            const journey = new UserJourney({
                userId,
                lastActivity: daysAgo(35)
            });
            
            journey._calculateEngagementLevel();
            
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.INACTIVE);
        });
    });
    
    describe('_determineUserPhase', () => {
        test('should set ONBOARDING phase if onboarding is not completed', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(20, false);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.ONBOARDING);
        });
        
        test('should set BEGINNER phase for less than 5 challenges', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(3, true);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.BEGINNER);
        });
        
        test('should set EXPLORER phase for 5-19 challenges', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(10, true);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.EXPLORER);
        });
        
        test('should set PRACTITIONER phase for 20-49 challenges', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(35, true);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.PRACTITIONER);
        });
        
        test('should set ADVANCED phase for 50-99 challenges', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(75, true);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.ADVANCED);
        });
        
        test('should set MASTER phase for 100+ challenges', () => {
            const journey = new UserJourney({ userId });
            
            journey._determineUserPhase(120, true);
            
            expect(journey.currentPhase).toBe(USER_JOURNEY_PHASES.MASTER);
        });
    });
    
    describe('generateInsightsAndRecommendations', () => {
        test('should generate insights based on phase and engagement level', () => {
            const journey = new UserJourney({
                userId,
                currentPhase: USER_JOURNEY_PHASES.EXPLORER,
                engagementLevel: ENGAGEMENT_LEVELS.ACTIVE
            });
            
            const result = journey.generateInsightsAndRecommendations();
            
            expect(result).toHaveProperty('insights');
            expect(result).toHaveProperty('recommendations');
            expect(result.insights).toContain('You are exploring different challenge types');
            expect(result.insights).toContain('You are regularly engaged with learning');
            expect(result.recommendations).toContain('Try a variety of focus areas to discover your strengths');
            expect(result.recommendations).toContain('Keep up the momentum with daily challenges');
        });
    });
    
    describe('_recalculateStateFromEvents', () => {
        test('should recalculate metrics and engagement from events', () => {
            // Create events over 3 consecutive days
            const yesterday = daysAgo(1);
            const twoDaysAgo = daysAgo(2);
            const threeDaysAgo = daysAgo(3);
            
            const events = [
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: threeDaysAgo,
                    eventData: { score: 70 },
                    challengeId
                }),
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: twoDaysAgo,
                    eventData: { score: 80 },
                    challengeId
                }),
                new UserJourneyEvent({
                    userId,
                    eventType: 'UserLoggedIn',
                    timestamp: yesterday
                })
            ];
            
            const journey = new UserJourney({
                userId,
                events
            });
            
            journey._recalculateStateFromEvents({ userJourney: { sessionTimeoutMinutes: 30 } });
            
            expect(journey.metrics.totalChallenges).toBe(2);
            expect(journey.metrics.averageScore).toBe(75);
            expect(journey.metrics.streakDays).toBe(2); // Two consecutive days with challenges
            expect(journey.lastActivity).toEqual(yesterday);
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.ACTIVE);
            expect(journey.sessionCount).toBeGreaterThan(0);
        });
        
        test('should handle empty events array', () => {
            const journey = new UserJourney({ userId });
            
            journey._recalculateStateFromEvents();
            
            expect(journey.metrics.totalChallenges).toBe(0);
            expect(journey.metrics.averageScore).toBe(0);
            expect(journey.lastActivity).toBeNull();
            expect(journey.engagementLevel).toBe(ENGAGEMENT_LEVELS.NEW);
            expect(journey.sessionCount).toBe(0);
        });
    });
    
    describe('_calculateActivityMetrics', () => {
        test('should correctly calculate total challenges, average score, and streak days', () => {
            // Create events with a 3-day streak
            const events = [
                // Day 1 - two challenges
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: daysAgo(3),
                    eventData: { score: 60 }
                }),
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: daysAgo(3),
                    eventData: { score: 70 }
                }),
                // Day 2 - one challenge
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: daysAgo(2),
                    eventData: { score: 80 }
                }),
                // Day 3 - one challenge
                new UserJourneyEvent({
                    userId,
                    eventType: mockEventTypes.CHALLENGE_COMPLETED,
                    timestamp: daysAgo(1),
                    eventData: { score: 90 }
                }),
                // Not a challenge event
                new UserJourneyEvent({
                    userId,
                    eventType: 'UserLoggedIn',
                    timestamp: new Date()
                })
            ];
            
            const journey = new UserJourney({ userId, events });
            
            journey._calculateActivityMetrics();
            
            expect(journey.metrics.totalChallenges).toBe(4);
            expect(journey.metrics.averageScore).toBe(75); // (60+70+80+90)/4
            expect(journey.metrics.streakDays).toBe(3); // 3 consecutive days
            expect(journey.metrics.lastChallenge).toEqual(daysAgo(1));
        });
        
        test('should handle no challenge events', () => {
            const events = [
                new UserJourneyEvent({
                    userId,
                    eventType: 'UserLoggedIn',
                    timestamp: new Date()
                })
            ];
            
            const journey = new UserJourney({ userId, events });
            
            journey._calculateActivityMetrics();
            
            expect(journey.metrics.totalChallenges).toBe(0);
            expect(journey.metrics.averageScore).toBe(0);
            expect(journey.metrics.streakDays).toBe(0);
            expect(journey.metrics.lastChallenge).toBeNull();
        });
    });
    
    describe('getter methods', () => {
        test('getEngagementLevel should return current engagement level', () => {
            const journey = new UserJourney({
                userId,
                engagementLevel: ENGAGEMENT_LEVELS.ACTIVE
            });
            
            expect(journey.getEngagementLevel()).toBe(ENGAGEMENT_LEVELS.ACTIVE);
        });
        
        test('getCurrentPhase should return current journey phase', () => {
            const journey = new UserJourney({
                userId,
                currentPhase: USER_JOURNEY_PHASES.EXPLORER
            });
            
            expect(journey.getCurrentPhase()).toBe(USER_JOURNEY_PHASES.EXPLORER);
        });
        
        test('getActivityMetrics should return copy of metrics', () => {
            const metrics = { totalChallenges: 5, averageScore: 85, streakDays: 3, lastChallenge: new Date() };
            const journey = new UserJourney({
                userId,
                metrics
            });
            
            const returnedMetrics = journey.getActivityMetrics();
            
            expect(returnedMetrics).toEqual(metrics); // Equal by value
            expect(returnedMetrics).not.toBe(metrics); // Not the same object reference
        });
    });
}); 