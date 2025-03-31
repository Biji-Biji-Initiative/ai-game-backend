import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { createEmail, createChallengeId, Email, ChallengeId } from '@src/core/common/valueObjects/index.js';
import ChallengeCoordinator from '@src/application/challengeCoordinator.js';
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

// Import the error classes directly
import {
    ChallengeNotFoundError,
    ChallengeGenerationError,
    ChallengeResponseError
} from "@src/core/challenge/errors/ChallengeErrors.js";

describe('ChallengeCoordinator Integration', () => {
    let challengeCoordinator;
    let mockUserService;
    let mockChallengeService;
    let mockChallengeConfigService;
    let mockChallengeFactory;
    let mockChallengeGenerationService;
    let mockChallengeEvaluationService;

    // Test data
    const testUserId = 'user-123';
    const testEmail = 'test@example.com';
    const testChallengeId = uuidv4();
    const testFocusArea = 'critical-thinking';

    // Create mocks for all required dependencies
    beforeEach(() => {
        // Create mock services
        mockUserService = {
            findByEmail: sinon.stub(),
            updateUser: sinon.stub().resolves({})
        };
        
        mockChallengeService = {
            getChallengeById: sinon.stub(),
            getRecentChallengesForUser: sinon.stub().resolves([]),
            getChallengesForUser: sinon.stub().resolves([]),
            saveChallenge: sinon.stub(),
            updateChallenge: sinon.stub()
        };
        
        mockChallengeConfigService = {
            getChallengeType: sinon.stub().resolves({}),
            getFormatType: sinon.stub().resolves({}),
            getDifficultyLevel: sinon.stub().resolves({})
        };
        
        mockChallengeFactory = {
            createChallenge: sinon.stub()
        };
        
        mockChallengeGenerationService = {
            generateChallenge: sinon.stub()
        };
        
        mockChallengeEvaluationService = {
            evaluateResponses: sinon.stub()
        };

        // Create coordinator with mocked dependencies
        challengeCoordinator = new ChallengeCoordinator({
            userService: mockUserService,
            challengeService: mockChallengeService,
            challengeConfigService: mockChallengeConfigService,
            challengeFactory: mockChallengeFactory,
            challengeGenerationService: mockChallengeGenerationService,
            challengeEvaluationService: mockChallengeEvaluationService,
            logger: mockLogger
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getChallengeById', () => {
        it('should call challengeService and return challenge with primitive ID', async () => {
            // Arrange
            const expectedChallenge = {
                id: testChallengeId,
                title: 'Test Challenge',
                description: 'Test description'
            };
            mockChallengeService.getChallengeById.resolves(expectedChallenge);
            // Act
            const result = await challengeCoordinator.getChallengeById(testChallengeId);
            // Assert
            expect(mockChallengeService.getChallengeById.calledOnce).to.be.true;
            // Verify it created a ChallengeId value object internally
            const challengeIdArg = mockChallengeService.getChallengeById.firstCall.args[0];
            expect(challengeIdArg).to.be.instanceof(ChallengeId);
            expect(challengeIdArg.value).to.equal(testChallengeId);
            expect(result).to.deep.equal(expectedChallenge);
        });
        it('should accept ChallengeId value object and pass it to the service', async () => {
            // Arrange
            const expectedChallenge = {
                id: testChallengeId,
                title: 'Test Challenge',
                description: 'Test description'
            };
            mockChallengeService.getChallengeById.resolves(expectedChallenge);
            // Create value object
            const challengeIdVO = createChallengeId(testChallengeId);
            // Act
            const result = await challengeCoordinator.getChallengeById(challengeIdVO);
            // Assert
            expect(mockChallengeService.getChallengeById.calledOnce).to.be.true;
            // Verify it passes the same value object without recreating it
            const challengeIdArg = mockChallengeService.getChallengeById.firstCall.args[0];
            expect(challengeIdArg).to.equal(challengeIdVO);
            expect(result).to.deep.equal(expectedChallenge);
        });
        it('should throw ChallengeNotFoundError if challenge not found', async () => {
            // Arrange
            mockChallengeService.getChallengeById.resolves(null);
            // Act & Assert
            try {
                await challengeCoordinator.getChallengeById(testChallengeId);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(ChallengeNotFoundError);
                expect(error.message).to.include('not found');
            }
        });
    });
    describe('getChallengeHistoryForUser', () => {
        it('should call challengeService and return user challenges with primitive email', async () => {
            // Arrange
            const expectedChallenges = [
                { id: uuidv4(), title: 'Challenge 1' },
                { id: uuidv4(), title: 'Challenge 2' }
            ];
            mockChallengeService.getChallengesForUser.resolves(expectedChallenges);
            // Act
            const result = await challengeCoordinator.getChallengeHistoryForUser(testEmail);
            // Assert
            expect(mockChallengeService.getChallengesForUser.calledOnce).to.be.true;
            // Verify it created an Email value object internally
            const emailArg = mockChallengeService.getChallengesForUser.firstCall.args[0];
            expect(emailArg).to.be.instanceof(Email);
            expect(emailArg.value).to.equal(testEmail);
            expect(result).to.deep.equal(expectedChallenges);
        });
        it('should accept Email value object and pass it to the service', async () => {
            // Arrange
            const expectedChallenges = [
                { id: uuidv4(), title: 'Challenge 1' },
                { id: uuidv4(), title: 'Challenge 2' }
            ];
            mockChallengeService.getChallengesForUser.resolves(expectedChallenges);
            // Create value object
            const emailVO = createEmail(testEmail);
            // Act
            const result = await challengeCoordinator.getChallengeHistoryForUser(emailVO);
            // Assert
            expect(mockChallengeService.getChallengesForUser.calledOnce).to.be.true;
            // Verify it passes the same value object without recreating it
            const emailArg = mockChallengeService.getChallengesForUser.firstCall.args[0];
            expect(emailArg).to.equal(emailVO);
            expect(result).to.deep.equal(expectedChallenges);
        });
    });
    describe('generateAndPersistChallenge', () => {
        it('should orchestrate the challenge generation and persistence flow', async () => {
            // Arrange - Mock user
            const mockUser = {
                id: testUserId,
                email: testEmail,
                name: 'Test User'
            };
            mockUserService.findByEmail.resolves(mockUser);
            // Arrange - Mock empty recent challenges
            mockChallengeService.getRecentChallengesForUser.resolves([]);
            // Arrange - Mock challenge factory result
            const mockChallengeEntity = {
                id: uuidv4(),
                title: 'Initial Challenge Title',
                challengeType: 'critical-analysis',
                formatType: 'case-study',
                difficulty: 'intermediate',
                focusArea: testFocusArea,
                typeMetadata: { name: 'Critical Analysis' },
                formatMetadata: { name: 'Case Study' }
            };
            mockChallengeFactory.createChallenge.resolves(mockChallengeEntity);
            // Arrange - Mock generation service result
            const mockGeneratedContent = {
                title: 'Generated Challenge Title',
                description: 'Generated description',
                instructions: 'Follow these instructions',
                content: { scenario: 'Test scenario' },
                evaluationCriteria: { criteria: 'Test criteria' },
                responseId: 'resp_123'
            };
            mockChallengeGenerationService.generateChallenge.resolves(mockGeneratedContent);
            // Arrange - Mock saved challenge
            const mockSavedChallenge = {
                ...mockChallengeEntity,
                title: mockGeneratedContent.title,
                description: mockGeneratedContent.description,
                instructions: mockGeneratedContent.instructions,
                content: mockGeneratedContent.content,
                evaluationCriteria: mockGeneratedContent.evaluationCriteria,
                responseId: mockGeneratedContent.responseId
            };
            mockChallengeService.saveChallenge.resolves(mockSavedChallenge);
            // Act
            const result = await challengeCoordinator.generateAndPersistChallenge({
                userEmail: testEmail,
                focusArea: testFocusArea,
                challengeType: 'critical-analysis',
                formatType: 'case-study',
                difficulty: 'intermediate'
            });
            // Assert
            // 1. Verify user lookup with email value object
            expect(mockUserService.findByEmail.calledOnce).to.be.true;
            const emailArg = mockUserService.findByEmail.firstCall.args[0];
            expect(emailArg).to.be.instanceof(Email);
            expect(emailArg.value).to.equal(testEmail);
            // 2. Verify challenge factory call
            expect(mockChallengeFactory.createChallenge.calledOnce).to.be.true;
            const factoryArgs = mockChallengeFactory.createChallenge.firstCall.args[0];
            expect(factoryArgs.user).to.equal(mockUser);
            expect(factoryArgs.challengeTypeCode).to.equal('critical-analysis');
            expect(factoryArgs.formatTypeCode).to.equal('case-study');
            // 3. Verify generation service call
            expect(mockChallengeGenerationService.generateChallenge.calledOnce).to.be.true;
            const genArg1 = mockChallengeGenerationService.generateChallenge.firstCall.args[0];
            expect(genArg1).to.equal(mockUser);
            // 4. Verify challenge save call
            expect(mockChallengeService.saveChallenge.calledOnce).to.be.true;
            // 5. Verify the returned challenge
            expect(result).to.equal(mockSavedChallenge);
        });
        it('should throw ChallengeGenerationError if user is not found', async () => {
            // Arrange
            mockUserService.findByEmail.resolves(null);
            // Act & Assert
            try {
                await challengeCoordinator.generateAndPersistChallenge({
                    userEmail: testEmail,
                    focusArea: testFocusArea
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(ChallengeGenerationError);
                expect(error.message).to.include('not found');
            }
        });
    });
    describe('submitChallengeResponse', () => {
        it('should orchestrate the challenge evaluation flow', async () => {
            // Arrange - Mock challenge
            const mockChallenge = {
                id: testChallengeId,
                title: 'Test Challenge',
                isCompleted: sinon.stub().returns(false),
                submitResponses: sinon.stub(),
                complete: sinon.stub(),
                getScore: sinon.stub().returns(85),
                challengeType: 'critical-analysis',
                focusArea: 'critical-thinking'
            };
            mockChallengeService.getChallengeById.resolves(mockChallenge);
            // Arrange - Mock evaluation result
            const mockEvaluation = {
                score: 85,
                feedback: 'Good job!',
                responseId: 'resp_eval_123'
            };
            mockChallengeEvaluationService.evaluateResponses.resolves(mockEvaluation);
            // Arrange - Mock updated challenge
            const mockUpdatedChallenge = {
                ...mockChallenge,
                status: 'completed',
                evaluation: mockEvaluation
            };
            mockChallengeService.updateChallenge.resolves(mockUpdatedChallenge);
            // Mock progress tracking service
            const mockProgressService = {
                updateProgressAfterChallenge: sinon.stub().resolves({})
            };
            // Mock user journey service
            const mockJourneyService = {
                recordUserEvent: sinon.stub().resolves({})
            };
            // Act
            const result = await challengeCoordinator.submitChallengeResponse({
                challengeId: testChallengeId,
                userEmail: testEmail,
                response: 'This is my test response',
                progressTrackingService: mockProgressService,
                userJourneyService: mockJourneyService
            });
            // Assert
            // 1. Verify challenge lookup
            expect(mockChallengeService.getChallengeById.calledOnce).to.be.true;
            const challengeIdArg = mockChallengeService.getChallengeById.firstCall.args[0];
            expect(challengeIdArg).to.be.instanceof(ChallengeId);
            expect(challengeIdArg.value).to.equal(testChallengeId);
            // 2. Verify response submission
            expect(mockChallenge.submitResponses.calledOnce).to.be.true;
            // 3. Verify evaluation service call
            expect(mockChallengeEvaluationService.evaluateResponses.calledOnce).to.be.true;
            // 4. Verify challenge completion and update
            expect(mockChallenge.complete.calledOnce).to.be.true;
            expect(mockChallenge.complete.calledWith(mockEvaluation)).to.be.true;
            expect(mockChallengeService.updateChallenge.calledOnce).to.be.true;
            // 5. Verify progress service call (secondary operation)
            // Wait a bit for async secondary operations to execute
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(mockProgressService.updateProgressAfterChallenge.called).to.be.true;
            // 6. Verify user journey service call (secondary operation)
            expect(mockJourneyService.recordUserEvent.called).to.be.true;
            // 7. Verify result contains evaluation and challenge
            expect(result).to.have.property('evaluation', mockEvaluation);
            expect(result).to.have.property('challenge', mockUpdatedChallenge);
        });
        it('should throw ChallengeNotFoundError if challenge is not found', async () => {
            // Arrange
            mockChallengeService.getChallengeById.resolves(null);
            // Act & Assert
            try {
                await challengeCoordinator.submitChallengeResponse({
                    challengeId: testChallengeId,
                    userEmail: testEmail,
                    response: 'This is my test response'
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(ChallengeResponseError);
                expect(error.message).to.include('not found');
            }
        });
        it('should throw ChallengeResponseError if challenge is already completed', async () => {
            // Arrange - Mock completed challenge
            const mockCompletedChallenge = {
                id: testChallengeId,
                title: 'Test Challenge',
                isCompleted: sinon.stub().returns(true)
            };
            mockChallengeService.getChallengeById.resolves(mockCompletedChallenge);
            // Act & Assert
            try {
                await challengeCoordinator.submitChallengeResponse({
                    challengeId: testChallengeId,
                    userEmail: testEmail,
                    response: 'This is my test response'
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).to.be.instanceof(ChallengeResponseError);
                expect(error.message).to.include('already completed');
            }
        });
    });
});
