import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import { v4 as _uuidv4 } from "uuid";
import valueObjects from '../../../src/core/common/valueObjects/index.js';
import PersonalityCoordinator from '../../../src/application/PersonalityCoordinator.js';
import { 
    PersonalityGenerationError, 
    PersonalityNotFoundError 
} from "../../../src/core/personality/errors/PersonalityErrors.js";
'use strict';

// Mock the domain logger
const mockLogger = {
    child: () => ({
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
    })
};

// Import value objects
const { _createEmail, createUserId, Email, UserId } = valueObjects;

describe('PersonalityCoordinator Integration', () => {
    let personalityCoordinator;
    let mockUserService;
    let mockPersonalityService;
    let mockPersonalityAnalysisService;
    
    // Test data
    const testUserId = 'user-123';
    const testEmail = 'test@example.com';
    
    // Create mocks for all required dependencies
    beforeEach(() => {
        // Create mock services
        mockUserService = {
            findByEmail: sinon.stub(),
            findById: sinon.stub(),
            updateUser: sinon.stub().resolves({})
        };
        
        mockPersonalityService = {
            getPersonalityByUserId: sinon.stub(),
            savePersonality: sinon.stub(),
            updatePersonality: sinon.stub()
        };
        
        mockPersonalityAnalysisService = {
            analyzePersonality: sinon.stub(),
            generateTraitsDescription: sinon.stub()
        };
        
        // Mock data loader
        const mockPersonalityDataLoader = {
            loadPersonalityDefaults: sinon.stub().resolves({}),
            loadTraitDefinitions: sinon.stub().resolves({})
        };
        
        // Create coordinator with mocked dependencies
        personalityCoordinator = new PersonalityCoordinator({
            userService: mockUserService,
            personalityService: mockPersonalityService,
            personalityAnalysisService: mockPersonalityAnalysisService,
            personalityDataLoader: mockPersonalityDataLoader,
            logger: mockLogger
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getUserPersonality', () => {
        it('should call personalityService and return personality with primitive user ID', async () => {
            // Arrange
            const expectedPersonality = {
                userId: testUserId,
                traits: { openness: 0.8, conscientiousness: 0.7 }
            };
            mockPersonalityService.getPersonalityByUserId.resolves(expectedPersonality);
            // Act
            const result = await personalityCoordinator.getUserPersonality(testUserId);
            // Assert
            expect(mockPersonalityService.getPersonalityByUserId.calledOnce).to.be.true;
            // Verify it created a UserId value object internally
            const userIdArg = mockPersonalityService.getPersonalityByUserId.firstCall.args[0];
            expect(userIdArg).to.be.instanceof(UserId);
            expect(userIdArg.value).to.equal(testUserId);
            expect(result).to.deep.equal(expectedPersonality);
        });
        it('should accept UserId value object and pass it to the service', async () => {
            // Arrange
            const expectedPersonality = {
                userId: testUserId,
                traits: { openness: 0.8, conscientiousness: 0.7 }
            };
            mockPersonalityService.getPersonalityByUserId.resolves(expectedPersonality);
            // Create value object
            const userIdVO = createUserId(testUserId);
            // Act
            const result = await personalityCoordinator.getUserPersonality(userIdVO);
            // Assert
            expect(mockPersonalityService.getPersonalityByUserId.calledOnce).to.be.true;
            // Verify it passes the same value object without recreating it
            const userIdArg = mockPersonalityService.getPersonalityByUserId.firstCall.args[0];
            expect(userIdArg).to.equal(userIdVO);
            expect(result).to.deep.equal(expectedPersonality);
        });
        it('should throw PersonalityNotFoundError if personality not found', async () => {
            // Arrange
            mockPersonalityService.getPersonalityByUserId.resolves(null);
            // Act & Assert
            try {
                await personalityCoordinator.getUserPersonality(testUserId);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(PersonalityNotFoundError);
                expect(error.message).to.include('not found');
            }
        });
    });
    describe('getUserPersonalityByEmail', () => {
        it('should lookup user by email and then get personality', async () => {
            // Arrange - Mock user
            const mockUser = {
                id: testUserId,
                email: testEmail,
                name: 'Test User'
            };
            mockUserService.findByEmail.resolves(mockUser);
            // Arrange - Mock personality
            const expectedPersonality = {
                userId: testUserId,
                traits: { openness: 0.8, conscientiousness: 0.7 }
            };
            mockPersonalityService.getPersonalityByUserId.resolves(expectedPersonality);
            // Act
            const result = await personalityCoordinator.getUserPersonalityByEmail(testEmail);
            // Assert
            // 1. Verify user lookup with email value object
            expect(mockUserService.findByEmail.calledOnce).to.be.true;
            const emailArg = mockUserService.findByEmail.firstCall.args[0];
            expect(emailArg).to.be.instanceof(Email);
            expect(emailArg.value).to.equal(testEmail);
            // 2. Verify personality lookup with user id
            expect(mockPersonalityService.getPersonalityByUserId.calledOnce).to.be.true;
            const userIdArg = mockPersonalityService.getPersonalityByUserId.firstCall.args[0];
            expect(userIdArg).to.be.instanceof(UserId);
            expect(userIdArg.value).to.equal(testUserId);
            // 3. Verify the returned personality
            expect(result).to.equal(expectedPersonality);
        });
        it('should throw PersonalityNotFoundError if user not found', async () => {
            // Arrange
            mockUserService.findByEmail.resolves(null);
            // Act & Assert
            try {
                await personalityCoordinator.getUserPersonalityByEmail(testEmail);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(PersonalityNotFoundError);
                expect(error.message).to.include('not found');
            }
        });
    });
    describe('generatePersonality', () => {
        it('should orchestrate the personality generation and persistence flow', async () => {
            // Arrange - Mock user
            const mockUser = {
                id: testUserId,
                email: testEmail,
                name: 'Test User',
                profile: {
                    interests: ['reading', 'hiking'],
                    background: 'Software developer'
                }
            };
            mockUserService.findByEmail.resolves(mockUser);
            // Arrange - Mock personality analysis result
            const mockAnalysisResult = {
                traits: {
                    openness: 0.8,
                    conscientiousness: 0.7,
                    extraversion: 0.6,
                    agreeableness: 0.9,
                    neuroticism: 0.3
                },
                learningStyle: 'visual',
                responseId: 'resp_123'
            };
            mockPersonalityAnalysisService.analyzePersonality.resolves(mockAnalysisResult);
            // Arrange - Mock traits description
            const mockTraitsDescription = {
                openness: 'You are highly curious and creative.',
                conscientiousness: 'You are organized and dependable.',
                extraversion: 'You enjoy social interactions in moderation.',
                agreeableness: 'You are very cooperative and empathetic.',
                neuroticism: 'You are generally calm and emotionally stable.'
            };
            mockPersonalityAnalysisService.generateTraitsDescription.resolves(mockTraitsDescription);
            // Arrange - Mock saved personality
            const mockSavedPersonality = {
                userId: testUserId,
                traits: mockAnalysisResult.traits,
                learningStyle: mockAnalysisResult.learningStyle,
                traitsDescription: mockTraitsDescription,
                responseId: mockAnalysisResult.responseId
            };
            mockPersonalityService.savePersonality.resolves(mockSavedPersonality);
            // Act
            const result = await personalityCoordinator.generatePersonality({
                userEmail: testEmail
            });
            // Assert
            // 1. Verify user lookup with email value object
            expect(mockUserService.findByEmail.calledOnce).to.be.true;
            const emailArg = mockUserService.findByEmail.firstCall.args[0];
            expect(emailArg).to.be.instanceof(Email);
            expect(emailArg.value).to.equal(testEmail);
            // 2. Verify personality analysis service call
            expect(mockPersonalityAnalysisService.analyzePersonality.calledOnce).to.be.true;
            const analysisArg = mockPersonalityAnalysisService.analyzePersonality.firstCall.args[0];
            expect(analysisArg).to.equal(mockUser);
            // 3. Verify traits description generation
            expect(mockPersonalityAnalysisService.generateTraitsDescription.calledOnce).to.be.true;
            const traitsArg = mockPersonalityAnalysisService.generateTraitsDescription.firstCall.args[0];
            expect(traitsArg).to.deep.equal(mockAnalysisResult.traits);
            // 4. Verify personality save call
            expect(mockPersonalityService.savePersonality.calledOnce).to.be.true;
            // 5. Verify the returned personality
            expect(result).to.equal(mockSavedPersonality);
        });
        it('should throw PersonalityGenerationError if user is not found', async () => {
            // Arrange
            mockUserService.findByEmail.resolves(null);
            // Act & Assert
            try {
                await personalityCoordinator.generatePersonality({
                    userEmail: testEmail
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(PersonalityGenerationError);
                expect(error.message).to.include('not found');
            }
        });
    });
});
