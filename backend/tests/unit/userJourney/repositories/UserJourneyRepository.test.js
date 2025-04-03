import { UserJourneyRepository } from "#app/core/userJourney/repositories/UserJourneyRepository.js";
import { UserJourney } from "#app/core/userJourney/models/UserJourney.js";
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import userJourneyMapper from "#app/core/userJourney/mappers/UserJourneyMapper.js";
import userJourneyEventMapper from "#app/core/userJourney/mappers/UserJourneyEventMapper.js";
import { v4 as uuidv4 } from "uuid";
import { UserJourneyNotFoundError, UserJourneyValidationError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";

describe('UserJourneyRepository', () => {
    // Mock dependencies
    const mockDb = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnThis(),
        rpc: jest.fn()
    };
    
    const mockEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn()
    };
    
    const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn(() => mockLogger)
    };
    
    let repository;
    const testUserId = uuidv4();
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Configure mockDb to return success responses by default
        mockDb.maybeSingle.mockResolvedValue({ data: null, error: null });
        mockDb.single.mockResolvedValue({ data: null, error: null });
        mockDb.eq.mockImplementation(() => mockDb);
        mockDb.from.mockImplementation(() => mockDb);
        
        // Create repository instance
        repository = new UserJourneyRepository({
            db: mockDb,
            eventBus: mockEventBus,
            logger: mockLogger
        });
        
        // Add spies for mappers
        jest.spyOn(userJourneyMapper, 'toDomain');
        jest.spyOn(userJourneyMapper, 'toPersistence');
        jest.spyOn(userJourneyEventMapper, 'toDomain');
        jest.spyOn(userJourneyEventMapper, 'toPersistence');
    });
    
    describe('findJourneyByUserId', () => {
        test('should fetch user journey by userId', async () => {
            const mockJourneyData = {
                id: uuidv4(),
                user_id: testUserId,
                engagement_level: 'active',
                metrics: JSON.stringify({ totalChallenges: 5 }),
                created_at: new Date().toISOString()
            };
            
            // Configure mock DB to return journey data
            mockDb.maybeSingle.mockResolvedValueOnce({ data: mockJourneyData, error: null });
            
            // Mock mapper
            const mockJourney = new UserJourney({ userId: testUserId });
            userJourneyMapper.toDomain.mockReturnValueOnce(mockJourney);
            
            const result = await repository.findJourneyByUserId(testUserId);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journeys');
            expect(mockDb.select).toHaveBeenCalledWith('*');
            expect(mockDb.eq).toHaveBeenCalledWith('user_id', testUserId);
            
            // Verify mapper calls
            expect(userJourneyMapper.toDomain).toHaveBeenCalledWith(
                mockJourneyData,
                expect.objectContaining({ EventTypes })
            );
            
            // Verify result
            expect(result).toBe(mockJourney);
        });
        
        test('should return null when journey not found', async () => {
            // Configure mock DB to return no data
            mockDb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
            
            const result = await repository.findJourneyByUserId(testUserId);
            
            expect(result).toBeNull();
        });
        
        test('should throw error on database failure', async () => {
            // Configure mock DB to return error
            mockDb.maybeSingle.mockResolvedValueOnce({ 
                data: null, 
                error: { message: 'Database error' } 
            });
            
            await expect(repository.findJourneyByUserId(testUserId))
                .rejects.toThrow(/Failed to fetch user journey/);
        });
        
        test('should load events when loadEvents=true', async () => {
            const mockJourneyData = {
                id: uuidv4(),
                user_id: testUserId,
                engagement_level: 'active',
                metrics: JSON.stringify({ totalChallenges: 5 })
            };
            
            const mockEvents = [
                { id: uuidv4(), user_id: testUserId, event_type: 'UserLoggedIn' },
                { id: uuidv4(), user_id: testUserId, event_type: 'ChallengeCompleted' }
            ];
            
            // Configure mock DB responses
            mockDb.maybeSingle.mockResolvedValueOnce({ data: mockJourneyData, error: null });
            
            // Mock journey
            const mockJourney = new UserJourney({ 
                userId: testUserId,
                id: mockJourneyData.id
            });
            userJourneyMapper.toDomain.mockReturnValueOnce(mockJourney);
            
            // Mock getUserEvents method
            const mockEventObjs = mockEvents.map(e => new UserJourneyEvent({
                id: e.id,
                userId: e.user_id,
                eventType: e.event_type
            }));
            
            jest.spyOn(repository, 'getUserEvents').mockResolvedValueOnce(mockEventObjs);
            
            const result = await repository.findJourneyByUserId(testUserId, true);
            
            // Verify getUserEvents was called
            expect(repository.getUserEvents).toHaveBeenCalledWith(testUserId);
            
            // Verify events were added to journey
            expect(result.events).toEqual(mockEventObjs);
        });
    });
    
    describe('saveJourney', () => {
        test('should persist UserJourney aggregate', async () => {
            const journey = new UserJourney({ 
                id: uuidv4(),
                userId: testUserId,
                engagementLevel: 'active'
            });
            
            // Add a domain event to the journey
            journey.addDomainEvent(EventTypes.USER_JOURNEY_UPDATED, { userId: testUserId });
            
            // Mock persistence data
            const persistenceData = {
                id: journey.id,
                user_id: testUserId,
                engagement_level: 'active'
            };
            userJourneyMapper.toPersistence.mockReturnValueOnce(persistenceData);
            
            // Mock DB response for upsert
            mockDb.single.mockResolvedValueOnce({ 
                data: persistenceData,
                error: null
            });
            
            // Mock mapper for return conversion
            userJourneyMapper.toDomain.mockReturnValueOnce(journey);
            
            // Mock transaction handler in BaseRepository
            jest.spyOn(repository, 'withTransaction').mockImplementation((fn, options) => {
                return fn(mockDb).then(result => {
                    if (options.publishEvents && result.domainEvents) {
                        result.domainEvents.forEach(event => {
                            mockEventBus.publish(event.type, event.data);
                        });
                    }
                    return result.result;
                });
            });
            
            const result = await repository.saveJourney(journey);
            
            // Verify persistence conversion
            expect(userJourneyMapper.toPersistence).toHaveBeenCalledWith(journey);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journeys');
            expect(mockDb.upsert).toHaveBeenCalledWith(
                persistenceData,
                expect.any(Object)
            );
            
            // Verify domain event publishing
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                EventTypes.USER_JOURNEY_UPDATED,
                expect.objectContaining({ 
                    userId: testUserId,
                    journeyId: journey.id
                })
            );
            
            // Verify result
            expect(result).toBe(journey);
        });
        
        test('should throw error for invalid journey instance', async () => {
            await expect(repository.saveJourney(null))
                .rejects.toThrow(UserJourneyValidationError);
                
            await expect(repository.saveJourney({ notAJourney: true }))
                .rejects.toThrow(UserJourneyValidationError);
        });
        
        test('should throw error on database failure', async () => {
            const journey = new UserJourney({ userId: testUserId });
            
            // Mock persistence data
            userJourneyMapper.toPersistence.mockReturnValueOnce({
                id: journey.id,
                user_id: testUserId
            });
            
            // Mock DB error
            mockDb.single.mockResolvedValueOnce({ 
                data: null, 
                error: { message: 'Database error' } 
            });
            
            // Mock withTransaction to pass through the error
            jest.spyOn(repository, 'withTransaction').mockImplementation((fn) => {
                return fn(mockDb);
            });
            
            await expect(repository.saveJourney(journey))
                .rejects.toThrow(/Failed to save user journey/);
        });
    });
    
    describe('recordEvent', () => {
        test('should persist a UserJourneyEvent', async () => {
            const event = new UserJourneyEvent({
                id: uuidv4(),
                userId: testUserId,
                eventType: 'UserLoggedIn',
                eventData: { device: 'mobile' }
            });
            
            // Mock persistence data
            const persistenceData = {
                id: event.id,
                user_id: testUserId,
                event_type: 'UserLoggedIn',
                event_data: { device: 'mobile' }
            };
            userJourneyEventMapper.toPersistence.mockReturnValueOnce(persistenceData);
            
            // Mock DB response
            mockDb.single.mockResolvedValueOnce({ 
                data: persistenceData,
                error: null
            });
            
            // Mock mapper for return conversion
            userJourneyEventMapper.toDomain.mockReturnValueOnce(event);
            
            const result = await repository.recordEvent(event);
            
            // Verify persistence conversion
            expect(userJourneyEventMapper.toPersistence).toHaveBeenCalledWith(event);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(mockDb.insert).toHaveBeenCalledWith(persistenceData);
            
            // Verify result
            expect(result).toBe(event);
        });
        
        test('should throw validation error for invalid event instance', async () => {
            await expect(repository.recordEvent(null))
                .rejects.toThrow(UserJourneyValidationError);
                
            await expect(repository.recordEvent({ notAnEvent: true }))
                .rejects.toThrow(UserJourneyValidationError);
        });
        
        test('should throw error on database failure', async () => {
            const event = new UserJourneyEvent({
                userId: testUserId,
                eventType: 'UserLoggedIn'
            });
            
            // Mock persistence data
            userJourneyEventMapper.toPersistence.mockReturnValueOnce({
                id: event.id,
                user_id: testUserId,
                event_type: 'UserLoggedIn'
            });
            
            // Mock DB error
            mockDb.single.mockResolvedValueOnce({ 
                data: null, 
                error: { message: 'Database error' } 
            });
            
            await expect(repository.recordEvent(event))
                .rejects.toThrow(/Failed to insert user journey event/);
        });
    });
    
    describe('getUserEvents', () => {
        test('should fetch events for a user', async () => {
            const mockEvents = [
                { 
                    id: uuidv4(), 
                    user_id: testUserId, 
                    event_type: 'UserLoggedIn',
                    timestamp: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    user_id: testUserId,
                    event_type: 'ChallengeCompleted',
                    timestamp: new Date().toISOString()
                }
            ];
            
            // Configure mock DB to return events
            mockDb.from.mockReturnThis();
            mockDb.select.mockReturnThis();
            mockDb.eq.mockReturnThis();
            mockDb.order.mockReturnThis();
            mockDb.order.mockResolvedValueOnce({ data: mockEvents, error: null });
            
            // Mock domain conversion
            const mockEventObjects = mockEvents.map(e => new UserJourneyEvent({
                id: e.id,
                userId: e.user_id,
                eventType: e.event_type,
                timestamp: e.timestamp
            }));
            
            userJourneyEventMapper.toDomain.mockImplementation((dbEvent) => {
                return new UserJourneyEvent({
                    id: dbEvent.id,
                    userId: dbEvent.user_id,
                    eventType: dbEvent.event_type,
                    timestamp: dbEvent.timestamp
                });
            });
            
            const result = await repository.getUserEvents(testUserId);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(mockDb.select).toHaveBeenCalledWith('*');
            expect(mockDb.eq).toHaveBeenCalledWith('user_id', testUserId);
            expect(mockDb.order).toHaveBeenCalledWith('timestamp', { ascending: false });
            
            // Verify result structure
            expect(result).toHaveLength(mockEvents.length);
            expect(result[0]).toBeInstanceOf(UserJourneyEvent);
            expect(result[0].id).toBe(mockEvents[0].id);
            expect(result[1].id).toBe(mockEvents[1].id);
        });
        
        test('should apply filters when provided', async () => {
            // Configure mock DB to return empty data
            mockDb.order.mockResolvedValueOnce({ data: [], error: null });
            
            const filters = {
                limit: 10,
                startDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                endDate: new Date().toISOString(),
                eventType: 'ChallengeCompleted'
            };
            
            await repository.getUserEvents(testUserId, filters);
            
            // Verify filters were applied
            expect(mockDb.eq).toHaveBeenCalledWith('user_id', testUserId);
            expect(mockDb.eq).toHaveBeenCalledWith('event_type', filters.eventType);
            expect(mockDb.gte).toHaveBeenCalledWith('timestamp', expect.any(String));
            expect(mockDb.lte).toHaveBeenCalledWith('timestamp', expect.any(String));
            expect(mockDb.limit).toHaveBeenCalledWith(filters.limit);
        });
        
        test('should throw error on database failure', async () => {
            // Configure mock DB to return error
            mockDb.order.mockResolvedValueOnce({ 
                data: null, 
                error: { message: 'Database error' } 
            });
            
            await expect(repository.getUserEvents(testUserId))
                .rejects.toThrow(/Failed to get user events/);
        });
    });
    
    describe('getUserEventsByType', () => {
        test('should fetch events of a specific type', async () => {
            const eventType = 'ChallengeCompleted';
            const mockEvents = [
                { 
                    id: uuidv4(), 
                    user_id: testUserId, 
                    event_type: eventType,
                    timestamp: new Date().toISOString()
                }
            ];
            
            // Configure mock DB to return events
            mockDb.order.mockResolvedValueOnce({ data: mockEvents, error: null });
            
            // Mock domain conversion
            userJourneyEventMapper.toDomain.mockImplementation((dbEvent) => {
                return new UserJourneyEvent({
                    id: dbEvent.id,
                    userId: dbEvent.user_id,
                    eventType: dbEvent.event_type,
                    timestamp: dbEvent.timestamp
                });
            });
            
            const result = await repository.getUserEventsByType(testUserId, eventType);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(mockDb.eq).toHaveBeenCalledWith('user_id', testUserId);
            expect(mockDb.eq).toHaveBeenCalledWith('event_type', eventType);
            
            // Verify result
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(UserJourneyEvent);
            expect(result[0].eventType).toBe(eventType);
        });
        
        test('should apply limit when provided', async () => {
            // Configure mock DB to return empty data
            mockDb.order.mockResolvedValueOnce({ data: [], error: null });
            
            const limit = 5;
            await repository.getUserEventsByType(testUserId, 'UserLoggedIn', limit);
            
            // Verify limit was applied
            expect(mockDb.limit).toHaveBeenCalledWith(limit);
        });
    });
    
    describe('getUserEventCountsByType', () => {
        test('should return counts of events by type', async () => {
            const mockEvents = [
                { event_type: 'UserLoggedIn' },
                { event_type: 'UserLoggedIn' },
                { event_type: 'ChallengeCompleted' },
                { event_type: 'ChallengeStarted' }
            ];
            
            // Configure mock DB to return events
            mockDb.from.mockReturnThis();
            mockDb.select.mockReturnThis();
            mockDb.eq.mockResolvedValueOnce({ data: mockEvents, error: null });
            
            const result = await repository.getUserEventCountsByType(testUserId);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(mockDb.select).toHaveBeenCalledWith('event_type');
            expect(mockDb.eq).toHaveBeenCalledWith('user_id', testUserId);
            
            // Verify result
            expect(result).toEqual({
                'UserLoggedIn': 2,
                'ChallengeCompleted': 1,
                'ChallengeStarted': 1
            });
        });
        
        test('should handle empty results', async () => {
            // Configure mock DB to return empty data
            mockDb.eq.mockResolvedValueOnce({ data: [], error: null });
            
            const result = await repository.getUserEventCountsByType(testUserId);
            
            // Verify result is empty object
            expect(result).toEqual({});
        });
        
        test('should fall back to query if RPC fails', async () => {
            // Mock RPC failure
            mockDb.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC error' } });
            
            // Mock fallback query
            const mockEvents = [{ event_type: 'UserLoggedIn' }];
            mockDb.eq.mockResolvedValueOnce({ data: mockEvents, error: null });
            
            const result = await repository.getUserEventCountsByType(testUserId);
            
            // Verify fallback query was used
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(result).toEqual({ 'UserLoggedIn': 1 });
        });
    });
    
    describe('getChallengeEvents', () => {
        test('should fetch events for a specific challenge', async () => {
            const challengeId = uuidv4();
            const mockEvents = [
                { 
                    id: uuidv4(), 
                    user_id: testUserId, 
                    event_type: 'ChallengeStarted',
                    challenge_id: challengeId,
                    timestamp: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    user_id: testUserId,
                    event_type: 'ChallengeCompleted',
                    challenge_id: challengeId,
                    timestamp: new Date().toISOString()
                }
            ];
            
            // Configure mock DB to return events
            mockDb.order.mockResolvedValueOnce({ data: mockEvents, error: null });
            
            // Mock domain conversion
            userJourneyEventMapper.toDomain.mockImplementation((dbEvent) => {
                return new UserJourneyEvent({
                    id: dbEvent.id,
                    userId: dbEvent.user_id,
                    eventType: dbEvent.event_type,
                    challengeId: dbEvent.challenge_id,
                    timestamp: dbEvent.timestamp
                });
            });
            
            const result = await repository.getChallengeEvents(challengeId);
            
            // Verify DB calls
            expect(mockDb.from).toHaveBeenCalledWith('user_journey_events');
            expect(mockDb.eq).toHaveBeenCalledWith('challenge_id', challengeId);
            
            // Verify result
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(UserJourneyEvent);
            expect(result[0].challengeId).toBe(challengeId);
            expect(result[1].challengeId).toBe(challengeId);
        });
    });
}); 