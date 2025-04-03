import userJourneyMapper from "#app/core/userJourney/mappers/UserJourneyMapper.js";
import { UserJourney } from "#app/core/userJourney/models/UserJourney.js";
import { v4 as uuidv4 } from "uuid";

describe('UserJourneyMapper', () => {
    // Sample data for tests
    const userId = uuidv4();
    const journeyId = uuidv4();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Sample database record
    const dbRecord = {
        id: journeyId,
        user_id: userId,
        last_activity: now.toISOString(),
        session_count: 5,
        current_session_started_at: yesterday.toISOString(),
        engagement_level: 'active',
        metrics: JSON.stringify({
            totalChallenges: 10,
            averageScore: 85,
            streakDays: 3,
            lastChallenge: yesterday.toISOString()
        }),
        metadata: JSON.stringify({
            preferences: {
                difficulty: 'intermediate'
            }
        }),
        created_at: yesterday.toISOString(),
        updated_at: now.toISOString()
    };
    
    // Sample domain object
    const createJourneyObject = () => {
        return new UserJourney({
            id: journeyId,
            userId: userId,
            lastActivity: now,
            sessionCount: 5,
            currentSessionStartedAt: yesterday,
            engagementLevel: 'active',
            currentPhase: 'explorer',
            metrics: {
                totalChallenges: 10,
                averageScore: 85,
                streakDays: 3,
                lastChallenge: yesterday
            },
            metadata: {
                preferences: {
                    difficulty: 'intermediate'
                }
            },
            createdAt: yesterday,
            updatedAt: now
        });
    };

    describe('toDomain', () => {
        test('should convert database record to UserJourney domain object', () => {
            const journey = userJourneyMapper.toDomain(dbRecord);
            
            expect(journey).toBeInstanceOf(UserJourney);
            expect(journey.id).toBe(journeyId);
            expect(journey.userId).toBe(userId);
            expect(journey.lastActivity.toISOString()).toBe(now.toISOString());
            expect(journey.sessionCount).toBe(5);
            expect(journey.currentSessionStartedAt.toISOString()).toBe(yesterday.toISOString());
            expect(journey.engagementLevel).toBe('active');
            expect(journey.metrics).toEqual({
                totalChallenges: 10,
                averageScore: 85,
                streakDays: 3,
                lastChallenge: yesterday.toISOString()
            });
            expect(journey.metadata).toEqual({
                preferences: {
                    difficulty: 'intermediate'
                }
            });
            expect(journey.createdAt.toISOString()).toBe(yesterday.toISOString());
            expect(journey.updatedAt.toISOString()).toBe(now.toISOString());
        });
        
        test('should handle metrics and metadata as objects', () => {
            const recordWithObjectData = {
                ...dbRecord,
                metrics: {
                    totalChallenges: 10,
                    averageScore: 85,
                    streakDays: 3,
                    lastChallenge: yesterday.toISOString()
                },
                metadata: {
                    preferences: {
                        difficulty: 'intermediate'
                    }
                }
            };
            
            const journey = userJourneyMapper.toDomain(recordWithObjectData);
            
            expect(journey).toBeInstanceOf(UserJourney);
            expect(journey.metrics).toEqual({
                totalChallenges: 10,
                averageScore: 85,
                streakDays: 3,
                lastChallenge: yesterday.toISOString()
            });
            expect(journey.metadata).toEqual({
                preferences: {
                    difficulty: 'intermediate'
                }
            });
        });
        
        test('should handle invalid JSON in metrics/metadata', () => {
            // Spy on logger to check for error log
            const errorSpy = jest.spyOn(userJourneyMapper.logger, 'error').mockImplementation(() => {});
            
            const recordWithInvalidJson = {
                ...dbRecord,
                metrics: '{invalid-json}',
                metadata: '{also-invalid}'
            };
            
            const journey = userJourneyMapper.toDomain(recordWithInvalidJson);
            
            expect(journey).toBeInstanceOf(UserJourney);
            expect(journey.metrics).toEqual({}); // Should fall back to empty object
            expect(journey.metadata).toEqual({}); // Should fall back to empty object
            
            // Verify error was logged
            expect(errorSpy).toHaveBeenCalledTimes(2);
            
            // Restore original implementation
            errorSpy.mockRestore();
        });
        
        test('should return null for null input', () => {
            const journey = userJourneyMapper.toDomain(null);
            expect(journey).toBeNull();
        });
        
        test('should handle failure in UserJourney constructor', () => {
            // Spy on logger to check for error log
            const errorSpy = jest.spyOn(userJourneyMapper.logger, 'error').mockImplementation(() => {});
            
            // Create record missing required userId
            const invalidRecord = { ...dbRecord, user_id: undefined };
            
            const journey = userJourneyMapper.toDomain(invalidRecord);
            
            expect(journey).toBeNull();
            expect(errorSpy).toHaveBeenCalled();
            
            // Restore original implementation
            errorSpy.mockRestore();
        });
    });
    
    describe('toPersistence', () => {
        test('should convert UserJourney domain object to database record', () => {
            const journey = createJourneyObject();
            const dbRecord = userJourneyMapper.toPersistence(journey);
            
            expect(dbRecord).not.toBeNull();
            expect(dbRecord.id).toBe(journeyId);
            expect(dbRecord.user_id).toBe(userId);
            expect(dbRecord.last_activity).toBe(now.toISOString());
            expect(dbRecord.session_count).toBe(5);
            expect(dbRecord.current_session_started_at).toBe(yesterday.toISOString());
            expect(dbRecord.engagement_level).toBe('active');
            expect(dbRecord.metrics).toEqual({
                totalChallenges: 10,
                averageScore: 85,
                streakDays: 3,
                lastChallenge: yesterday
            });
            expect(dbRecord.metadata).toEqual({
                preferences: {
                    difficulty: 'intermediate'
                }
            });
            expect(dbRecord.created_at).toBe(yesterday.toISOString());
            expect(dbRecord.updated_at).toBe(now.toISOString());
        });
        
        test('should handle non-Date objects', () => {
            const journey = createJourneyObject();
            // Replace dates with ISO strings directly
            journey.lastActivity = now.toISOString();
            journey.currentSessionStartedAt = yesterday.toISOString();
            journey.createdAt = yesterday.toISOString();
            journey.updatedAt = now.toISOString();
            
            const dbRecord = userJourneyMapper.toPersistence(journey);
            
            expect(dbRecord.last_activity).toBe(now.toISOString());
            expect(dbRecord.current_session_started_at).toBe(yesterday.toISOString());
            expect(dbRecord.created_at).toBe(yesterday.toISOString());
            expect(dbRecord.updated_at).toBe(now.toISOString());
        });
        
        test('should return null for null input', () => {
            const dbRecord = userJourneyMapper.toPersistence(null);
            expect(dbRecord).toBeNull();
        });
        
        test('should return null for non-UserJourney input', () => {
            const dbRecord = userJourneyMapper.toPersistence({ id: 'fake-object' });
            expect(dbRecord).toBeNull();
        });
    });
    
    describe('toDomainCollection', () => {
        test('should convert array of database records to UserJourney domain objects', () => {
            const dbRecords = [
                dbRecord,
                { ...dbRecord, id: uuidv4(), user_id: uuidv4() }
            ];
            
            const journeys = userJourneyMapper.toDomainCollection(dbRecords);
            
            expect(journeys).toHaveLength(2);
            expect(journeys[0]).toBeInstanceOf(UserJourney);
            expect(journeys[1]).toBeInstanceOf(UserJourney);
            expect(journeys[0].id).toBe(dbRecords[0].id);
            expect(journeys[1].id).toBe(dbRecords[1].id);
        });
        
        test('should filter out failed conversions', () => {
            const dbRecords = [
                dbRecord,
                { id: uuidv4() } // Missing user_id, will fail to map
            ];
            
            // Spy on logger to silence errors
            jest.spyOn(userJourneyMapper.logger, 'error').mockImplementation(() => {});
            
            const journeys = userJourneyMapper.toDomainCollection(dbRecords);
            
            expect(journeys).toHaveLength(1);
            expect(journeys[0]).toBeInstanceOf(UserJourney);
            expect(journeys[0].id).toBe(dbRecords[0].id);
        });
        
        test('should return empty array for null input', () => {
            const journeys = userJourneyMapper.toDomainCollection(null);
            expect(journeys).toEqual([]);
        });
    });
    
    describe('toPersistenceCollection', () => {
        test('should convert array of UserJourney domain objects to database records', () => {
            const journeys = [
                createJourneyObject(),
                new UserJourney({
                    id: uuidv4(),
                    userId: uuidv4(),
                    engagementLevel: 'engaged'
                })
            ];
            
            const dbRecords = userJourneyMapper.toPersistenceCollection(journeys);
            
            expect(dbRecords).toHaveLength(2);
            expect(dbRecords[0].id).toBe(journeys[0].id);
            expect(dbRecords[1].id).toBe(journeys[1].id);
            expect(dbRecords[0].user_id).toBe(journeys[0].userId);
            expect(dbRecords[1].user_id).toBe(journeys[1].userId);
            expect(dbRecords[0].engagement_level).toBe('active');
            expect(dbRecords[1].engagement_level).toBe('engaged');
        });
        
        test('should filter out null conversions', () => {
            const journeys = [
                createJourneyObject(),
                null, // Should be filtered out
                { notAJourney: true } // Should be filtered out
            ];
            
            const dbRecords = userJourneyMapper.toPersistenceCollection(journeys);
            
            expect(dbRecords).toHaveLength(1);
            expect(dbRecords[0].id).toBe(journeys[0].id);
        });
        
        test('should return empty array for null input', () => {
            const dbRecords = userJourneyMapper.toPersistenceCollection(null);
            expect(dbRecords).toEqual([]);
        });
    });
}); 