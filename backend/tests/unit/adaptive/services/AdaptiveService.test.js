import AdaptiveService from "#app/core/adaptive/services/AdaptiveService.js";
import Recommendation from "#app/core/adaptive/models/Recommendation.js";
import Difficulty from "#app/core/adaptive/models/Difficulty.js";
import { AdaptiveError, AdaptiveValidationError } from "#app/core/adaptive/errors/adaptiveErrors.js";
import { v4 as uuidv4 } from "uuid";

describe('AdaptiveService', () => {
    // Mock dependencies
    const mockAdaptiveRepository = {
        save: jest.fn((recommendation) => Promise.resolve(recommendation)),
        findLatestForUser: jest.fn(() => Promise.resolve(null))
    };
    
    const mockProgressService = {
        getOrCreateProgress: jest.fn((userId) => Promise.resolve({
            userId,
            focusArea: 'Prompt_Engineering',
            skillLevels: {
                prompt_engineering: 80,
                debugging: 60,
                coding: 75,
                analysis: 45
            },
            weaknesses: ['Analysis', 'Problem Solving'],
            strengths: ['Prompt Engineering', 'Implementation'],
            statistics: {
                averageScore: 70
            },
            completedChallenges: [
                {
                    challengeId: uuidv4(),
                    challengeType: 'implementation',
                    focusArea: 'Prompt_Engineering',
                    score: 85,
                    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
                },
                {
                    challengeId: uuidv4(),
                    challengeType: 'debugging',
                    focusArea: 'Implementation',
                    score: 65,
                    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
                }
            ]
        })),
        getProgress: jest.fn((userId) => Promise.resolve({
            userId,
            focusArea: 'Prompt_Engineering',
            statistics: { averageScore: 70 }
        }))
    };
    
    const mockPersonalityService = {
        getProfile: jest.fn((userId) => Promise.resolve({
            userId,
            dominantTraits: ['Analytical', 'Curious'],
            focusArea: 'AI_Ethics'
        }))
    };
    
    const mockChallengeConfigService = {
        getDifficultyLevel: jest.fn((code) => Promise.resolve({ code, name: code.charAt(0).toUpperCase() + code.slice(1) })),
        getAllFormatTypes: jest.fn(() => Promise.resolve([
            { code: 'code', name: 'Code' },
            { code: 'design', name: 'Design' },
            { code: 'debug', name: 'Debug' }
        ])),
        getAllFocusAreas: jest.fn(() => Promise.resolve([
            { code: 'Prompt_Engineering', name: 'Prompt Engineering' },
            { code: 'AI_Ethics', name: 'AI Ethics' },
            { code: 'RAG', name: 'RAG' },
            { code: 'Implementation', name: 'Implementation' },
            { code: 'Debugging', name: 'Debugging' }
        ])),
        getChallengeType: jest.fn((code) => Promise.resolve({ 
            code, 
            name: code.charAt(0).toUpperCase() + code.slice(1),
            defaultFormatTypeCode: 'code',
            relatedTypes: ['analysis', 'design']
        })),
        getAllChallengeTypes: jest.fn(() => Promise.resolve([
            { code: 'implementation', name: 'Implementation', defaultFormatTypeCode: 'code' },
            { code: 'debugging', name: 'Debugging', defaultFormatTypeCode: 'debug' },
            { code: 'design', name: 'Design', defaultFormatTypeCode: 'design' }
        ])),
        getFormatType: jest.fn((code) => Promise.resolve({ code, name: code.charAt(0).toUpperCase() + code.slice(1) })),
        getTraitMappings: jest.fn(() => Promise.resolve({
            'Analytical': ['Debugging', 'Analysis'],
            'Curious': ['RAG', 'AI_Ethics'],
            'Creative': ['Prompt_Engineering', 'Design']
        }))
    };
    
    const mockChallengePersonalizationService = {
        selectChallengeType: jest.fn((traits, focusAreas, typeOptions) => Promise.resolve({
            code: 'implementation',
            name: 'Implementation',
            defaultFormatTypeCode: 'code',
            relatedTypes: ['analysis', 'design']
        })),
        determineDifficulty: jest.fn((score, completedCount) => {
            if (score >= 85) return 'advanced';
            if (score >= 70) return 'intermediate';
            return 'beginner';
        })
    };
    
    const mockUserService = {
        getUserById: jest.fn((userId) => Promise.resolve({
            id: userId,
            difficultyLevel: 'intermediate',
            preferences: {
                challenges: {
                    preferredChallengeType: 'implementation',
                    languages: ['javascript', 'python'],
                    topics: ['AI', 'Machine Learning']
                }
            },
            onboardingCompleted: true
        })),
        updateUserDifficulty: jest.fn((userId, difficultyLevel) => Promise.resolve({ success: true }))
    };
    
    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(() => mockLogger)
    };
    
    const mockCacheService = {
        getOrSet: jest.fn((key, fn, ttl) => fn()),
        keys: jest.fn(() => []),
        delete: jest.fn()
    };
    
    // Create service instance for testing
    let adaptiveService;
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create a fresh instance for each test
        adaptiveService = new AdaptiveService({
            adaptiveRepository: mockAdaptiveRepository,
            progressService: mockProgressService,
            personalityService: mockPersonalityService,
            challengeConfigService: mockChallengeConfigService,
            challengePersonalizationService: mockChallengePersonalizationService,
            userService: mockUserService,
            logger: mockLogger,
            cacheService: mockCacheService
        });
    });
    
    describe('generateAndSaveRecommendations', () => {
        const userId = uuidv4();
        
        test('should generate and save personalized recommendations', async () => {
            const recommendation = await adaptiveService.generateAndSaveRecommendations(userId);
            
            // Verify all dependencies were called correctly
            expect(mockProgressService.getOrCreateProgress).toHaveBeenCalledWith(userId);
            expect(mockPersonalityService.getProfile).toHaveBeenCalledWith(userId);
            expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
            expect(mockChallengeConfigService.getTraitMappings).toHaveBeenCalled();
            expect(mockChallengeConfigService.getAllFocusAreas).toHaveBeenCalled();
            
            // Verify a recommendation was created and saved
            expect(recommendation).toBeInstanceOf(Recommendation);
            expect(mockAdaptiveRepository.save).toHaveBeenCalledWith(expect.any(Recommendation));
            
            // Verify recommendation data
            expect(recommendation.userId).toBe(userId);
            expect(recommendation.recommendedFocusAreas).toBeInstanceOf(Array);
            expect(recommendation.recommendedFocusAreas.length).toBeGreaterThan(0);
            expect(recommendation.recommendedChallengeTypes).toBeInstanceOf(Array);
            expect(recommendation.recommendedChallengeTypes.length).toBeGreaterThan(0);
            expect(recommendation.suggestedLearningResources).toBeInstanceOf(Array);
            expect(recommendation.metadata.generationSource).toBe('AdaptiveServiceDynamic');
        });
        
        test('should handle missing progress or personality data', async () => {
            // Mock services to return null
            mockProgressService.getOrCreateProgress.mockResolvedValueOnce(null);
            mockPersonalityService.getProfile.mockResolvedValueOnce(null);
            
            const recommendation = await adaptiveService.generateAndSaveRecommendations(userId);
            
            // Should still create a recommendation with default values
            expect(recommendation).toBeInstanceOf(Recommendation);
            expect(recommendation.recommendedFocusAreas).toContain('AI_Ethics');
            expect(recommendation.recommendedChallengeTypes).toContain('implementation');
        });
        
        test('should throw error if repository save fails', async () => {
            // Mock repository to throw error
            mockAdaptiveRepository.save.mockRejectedValueOnce(new Error('Database error'));
            
            await expect(adaptiveService.generateAndSaveRecommendations(userId))
                .rejects.toThrow(AdaptiveError);
            
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('getLatestRecommendations', () => {
        const userId = uuidv4();
        
        test('should return existing recommendation if found', async () => {
            const mockRecommendation = new Recommendation({
                id: uuidv4(),
                userId,
                recommendedFocusAreas: ['AI_Ethics'],
                recommendedChallengeTypes: ['implementation']
            });
            
            mockAdaptiveRepository.findLatestForUser.mockResolvedValueOnce(mockRecommendation);
            
            const result = await adaptiveService.getLatestRecommendations(userId);
            
            expect(result).toBe(mockRecommendation);
            expect(mockAdaptiveRepository.findLatestForUser).toHaveBeenCalledWith(userId);
            expect(adaptiveService.generateAndSaveRecommendations).not.toHaveBeenCalled(); // Shouldn't generate new one
        });
        
        test('should generate new recommendation if none exists', async () => {
            // Mock implementation to test internal method call
            const generateAndSaveRecommendationsSpy = jest.spyOn(adaptiveService, 'generateAndSaveRecommendations');
            generateAndSaveRecommendationsSpy.mockImplementation((userId) => {
                return Promise.resolve(new Recommendation({
                    id: uuidv4(),
                    userId,
                    recommendedFocusAreas: ['AI_Ethics'],
                    recommendedChallengeTypes: ['implementation']
                }));
            });
            
            mockAdaptiveRepository.findLatestForUser.mockResolvedValueOnce(null);
            
            const result = await adaptiveService.getLatestRecommendations(userId);
            
            expect(result).toBeInstanceOf(Recommendation);
            expect(mockAdaptiveRepository.findLatestForUser).toHaveBeenCalledWith(userId);
            expect(generateAndSaveRecommendationsSpy).toHaveBeenCalledWith(userId, expect.any(Object));
        });
        
        test('should throw validation error for missing userId', async () => {
            await expect(adaptiveService.getLatestRecommendations(null))
                .rejects.toThrow(AdaptiveValidationError);
        });
    });
    
    describe('generateChallenge', () => {
        const userId = uuidv4();
        
        test('should generate personalized challenge parameters', async () => {
            const result = await adaptiveService.generateChallenge(userId);
            
            // Verify dependencies were called
            expect(mockPersonalityService.getProfile).toHaveBeenCalledWith(userId);
            expect(mockProgressService.getOrCreateProgress).toHaveBeenCalledWith(userId);
            expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
            
            // Verify challenge parameters structure
            expect(result).toEqual(expect.objectContaining({
                userId,
                focusArea: expect.any(String),
                challengeType: expect.any(String),
                formatType: expect.any(String),
                difficulty: expect.any(String),
                timeAllocation: expect.any(Number),
                complexity: expect.any(Number),
                depth: expect.any(Number),
                userContext: expect.any(Object)
            }));
            
            // Verify user context contains rich information
            expect(result.userContext).toEqual(expect.objectContaining({
                skillLevels: expect.any(Array),
                traits: expect.any(Array),
                strengths: expect.any(Array),
                weaknesses: expect.any(Array),
                experienceLevel: expect.any(String)
            }));
        });
        
        test('should respect requested options when provided', async () => {
            const options = {
                focusArea: 'RAG',
                challengeType: 'design',
                formatType: 'design',
                difficulty: 'expert'
            };
            
            const result = await adaptiveService.generateChallenge(userId, options);
            
            expect(result.focusArea).toBe(options.focusArea);
            expect(result.challengeType).toBe(options.challengeType);
            expect(result.formatType).toBe(options.formatType);
            expect(result.difficulty).toBe(options.difficulty);
        });
        
        test('should handle missing user data gracefully', async () => {
            // Mock services to return null
            mockPersonalityService.getProfile.mockRejectedValueOnce(new Error('Not found'));
            
            const result = await adaptiveService.generateChallenge(userId);
            
            // Should still return valid parameters with defaults
            expect(result).toEqual(expect.objectContaining({
                userId,
                focusArea: expect.any(String),
                challengeType: expect.any(String),
                difficulty: expect.any(String)
            }));
        });
        
        test('should throw validation error for missing userId', async () => {
            await expect(adaptiveService.generateChallenge(null))
                .rejects.toThrow(AdaptiveValidationError);
        });
    });
    
    describe('adjustDifficulty', () => {
        const userId = uuidv4();
        
        test('should adjust difficulty based on performance data', async () => {
            const performanceData = {
                challengeId: uuidv4(),
                score: 85,
                timeSpent: 1200
            };
            
            const result = await adaptiveService.adjustDifficulty(userId, performanceData);
            
            expect(result).toBeInstanceOf(Difficulty);
            expect(mockUserService.updateUserDifficulty).toHaveBeenCalled();
        });
        
        test('should throw validation error for missing userId', async () => {
            await expect(adaptiveService.adjustDifficulty(null, { score: 80 }))
                .rejects.toThrow(AdaptiveValidationError);
        });
        
        test('should throw validation error for missing score', async () => {
            await expect(adaptiveService.adjustDifficulty(userId, {}))
                .rejects.toThrow(AdaptiveValidationError);
        });
    });
    
    describe('helper methods', () => {
        const userId = uuidv4();
        
        test('_mapSkillsToFocusAreas should map skills to focus areas', async () => {
            const skills = ['prompt_engineering', 'debugging', 'unknown_skill'];
            const result = await adaptiveService._mapSkillsToFocusAreas(skills);
            
            expect(result).toEqual(expect.arrayContaining(['Prompt_Engineering', 'Debugging']));
            expect(result).toContain('unknown_skill'); // Should keep unknown skills
        });
        
        test('_calculateRecentAverageScore should average recent scores', () => {
            const completedChallenges = [
                { score: 90, completedAt: new Date().toISOString() },
                { score: 80, completedAt: new Date(Date.now() - 1000).toISOString() },
                { score: 70, completedAt: new Date(Date.now() - 2000).toISOString() },
                { score: 60, completedAt: new Date(Date.now() - 3000).toISOString() }
            ];
            
            const result = adaptiveService._calculateRecentAverageScore(completedChallenges, 3);
            expect(result).toBe((90 + 80 + 70) / 3); // Average of top 3
        });
        
        test('_calculateRecentAverageScore should handle empty input', () => {
            expect(adaptiveService._calculateRecentAverageScore([])).toBeNull();
            expect(adaptiveService._calculateRecentAverageScore(null)).toBeNull();
        });
        
        test('_formatSkillName should format skill keys into readable names', () => {
            expect(adaptiveService._formatSkillName('prompt_engineering')).toBe('Prompt Engineering');
            expect(adaptiveService._formatSkillName('promptEngineering')).toBe('Prompt Engineering');
        });
        
        test('_deriveStrengthsFromSkills should identify skills above threshold', () => {
            const skillLevels = {
                prompt_engineering: 85,
                debugging: 75,
                coding: 90,
                analysis: 60
            };
            
            const strengths = adaptiveService._deriveStrengthsFromSkills(skillLevels);
            
            expect(strengths).toContain('Coding');
            expect(strengths).toContain('Prompt Engineering');
            expect(strengths).toContain('Debugging');
            expect(strengths).not.toContain('Analysis'); // Below threshold
        });
        
        test('_deriveWeaknessesFromSkills should identify skills below threshold', () => {
            const skillLevels = {
                prompt_engineering: 85,
                debugging: 75,
                coding: 90,
                analysis: 45,
                problem_solving: 55
            };
            
            const weaknesses = adaptiveService._deriveWeaknessesFromSkills(skillLevels);
            
            expect(weaknesses).toContain('Analysis');
            expect(weaknesses).toContain('Problem Solving');
            expect(weaknesses).not.toContain('Coding'); // Above threshold
        });
        
        test('_determineExperienceLevel should categorize based on challenge count and skill levels', () => {
            expect(adaptiveService._determineExperienceLevel(5, [30, 40, 50])).toBe('beginner');
            expect(adaptiveService._determineExperienceLevel(15, [60, 70, 65])).toBe('intermediate');
            expect(adaptiveService._determineExperienceLevel(30, [80, 75, 85])).toBe('advanced');
            expect(adaptiveService._determineExperienceLevel(50, [90, 85, 95])).toBe('expert');
        });
    });
    
    describe('_determineFocusArea', () => {
        const userId = uuidv4();
        
        test('should prefer explicitly requested focus area', async () => {
            const params = {
                requestedFocusArea: 'RAG',
                progressFocusArea: 'Prompt_Engineering',
                personalityFocusArea: 'AI_Ethics'
            };
            
            const result = await adaptiveService._determineFocusArea(userId, params);
            expect(result).toBe(params.requestedFocusArea);
        });
        
        test('should use weakness-based focus area when available', async () => {
            const params = {
                weaknesses: ['Analysis', 'Problem Solving'],
                skillLevels: {},
                completedChallenges: [],
                preferences: {}
            };
            
            // Spy on internal method
            const mapSkillsSpy = jest.spyOn(adaptiveService, '_mapSkillsToFocusAreas');
            mapSkillsSpy.mockResolvedValueOnce(['Analysis', 'Problem_Solving']);
            
            const result = await adaptiveService._determineFocusArea(userId, params);
            expect(['Analysis', 'Problem_Solving']).toContain(result);
            expect(mapSkillsSpy).toHaveBeenCalledWith(params.weaknesses);
        });
        
        test('should fall back to default when no data available', async () => {
            const params = {};
            
            const result = await adaptiveService._determineFocusArea(userId, params);
            expect(result).toBe('general');
        });
    });
    
    describe('_determineChallengeType', () => {
        const userId = uuidv4();
        
        test('should prefer explicitly requested challenge type', async () => {
            const params = {
                requestedType: 'design',
                dominantTraits: ['Analytical'],
                focusArea: 'AI_Ethics'
            };
            
            const result = await adaptiveService._determineChallengeType(userId, params);
            expect(result.code).toBe(params.requestedType);
        });
        
        test('should select type based on history for variety', async () => {
            const params = {
                dominantTraits: ['Analytical'],
                focusArea: 'AI_Ethics',
                completedChallenges: [
                    { challengeType: 'implementation' },
                    { challengeType: 'implementation' },
                    { challengeType: 'debugging' }
                ],
                preferences: {}
            };
            
            const result = await adaptiveService._determineChallengeType(userId, params);
            expect(result).toBeDefined();
            // Should not pick recently used types
            expect(result.code).not.toBe('implementation');
            expect(result.code).not.toBe('debugging');
        });
        
        test('should use personalization service when other methods fail', async () => {
            const params = {
                dominantTraits: ['Analytical'],
                focusArea: 'AI_Ethics',
                completedChallenges: [],
                preferences: {}
            };
            
            const result = await adaptiveService._determineChallengeType(userId, params);
            expect(result.code).toBe('implementation'); // From mock personalization service
            expect(mockChallengePersonalizationService.selectChallengeType).toHaveBeenCalledWith(
                params.dominantTraits,
                [params.focusArea]
            );
        });
    });
}); 