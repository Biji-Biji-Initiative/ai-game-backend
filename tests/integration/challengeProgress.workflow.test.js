import { jest } from '@jest/globals';
/**
 * Integration Test: Challenge-Progress Workflow
 * 
 * This test suite verifies the cross-domain event workflow between:
 * - Challenge completion events
 * - Progress tracking updates
 * 
 * It ensures that when a challenge is completed and evaluated,
 * the user's progress is properly updated across domains.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { EventTypes } from '../../src/core/common/events/eventTypes.js';
import { EventBus } from '../../src/core/common/events/eventBus.js';
import { createUserId, createChallengeId, createEvaluationId } from '../../src/core/common/valueObjects/index.js';
import ChallengeRepository from '../../src/core/challenge/repositories/challengeRepository.js';
import ProgressRepository from '../../src/core/progress/repositories/ProgressRepository.js';
import ChallengeService from '../../src/core/challenge/services/ChallengeService.js';
import ProgressService from '../../src/core/progress/services/ProgressService.js';
import UserService from '../../src/core/user/services/UserService.js';
import { InMemoryRepository } from '../../src/core/common/repositories/InMemoryRepository.js';

describe('Integration: Challenge-Progress Workflow', function() {
  // Set up test timeout
  jest.setTimeout(5000);
  
  // Create test value objects
  const testUserId = createUserId('user-test-123');
  const testChallengeId = createChallengeId('challenge-test-123');
  const testEvaluationId = createEvaluationId('evaluation-test-123');
  
  // Test services and repositories
  let eventBus;
  let challengeRepository;
  let progressRepository;
  let userRepository;
  let challengeService;
  let progressService;
  let userService;
  let logger;
  
  // Spy on event subscription
  let progressEventHandler;
  
  beforeEach(function() {
    // Create shared event bus
    eventBus = new EventBus();
    
    // Create logger mock
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub()
    };
    
    // Create in-memory repositories
    challengeRepository = new InMemoryRepository();
    progressRepository = new InMemoryRepository();
    userRepository = new InMemoryRepository();
    
    // Set up test challenge in repository
    const testChallenge = {
      id: testChallengeId.value,
      userId: testUserId.value,
      title: 'Test Challenge',
      difficulty: 'medium',
      challengeType: 'logical-reasoning',
      content: { description: 'Test your logical reasoning skills' },
      createdAt: new Date().toISOString()
    };
    challengeRepository.items[testChallengeId.value] = testChallenge;
    
    // Set up test user progress in repository
    const testProgress = {
      userId: testUserId.value,
      completedChallenges: [],
      totalChallengesCompleted: 0,
      challengeProgressByType: {},
      skills: {},
      streakDays: 0,
      lastActive: new Date().toISOString()
    };
    progressRepository.items[testUserId.value] = testProgress;
    
    // Set up test user in repository
    const testUser = {
      id: testUserId.value,
      email: 'test@example.com',
      fullName: 'Test User',
      professionalTitle: 'Software Engineer',
      createdAt: new Date().toISOString(),
      isActive: true
    };
    userRepository.items[testUserId.value] = testUser;
    
    // Create services with repositories and event bus
    challengeService = new ChallengeService(challengeRepository, eventBus, logger);
    progressService = new ProgressService(progressRepository, eventBus, logger);
    userService = new UserService(userRepository, eventBus, logger);
    
    // Spy on the event handler in ProgressService
    progressEventHandler = sinon.spy(progressService, 'handleChallengeCompleted');
    
    // Register event handlers for cross-domain communication
    eventBus.subscribe(EventTypes.CHALLENGE_COMPLETED, progressService.handleChallengeCompleted.bind(progressService));
  });
  
  afterEach(function() {
    // Restore spies and stubs
    sinon.restore();
  });
  
  describe('Challenge Completion to Progress Update Flow', function() {
    it('should update progress when a challenge is completed', async function() {
      // Create evaluation data for the completed challenge
      const evaluationData = {
        id: testEvaluationId.value,
        challengeId: testChallengeId.value,
        userId: testUserId.value,
        responseText: 'This is my test response',
        overallScore: 85,
        feedback: 'Good job!',
        strengths: ['Clear reasoning', 'Good structure'],
        areasForImprovement: ['Add more examples'],
        createdAt: new Date().toISOString()
      };
      
      // Trigger a challenge completed event from the challenge service
      await challengeService.markChallengeCompleted(
        testChallengeId,
        testUserId,
        evaluationData.overallScore,
        testEvaluationId
      );
      
      // Verify the challenge completion event was published
      const challenge = await challengeRepository.findById(testChallengeId.value);
      expect(challenge.completed).to.be.true;
      
      // Verify the event handler in ProgressService was called
      expect(progressEventHandler.called).to.be.true;
      
      // Verify the progress was updated
      const userProgress = await progressRepository.findById(testUserId.value);
      expect(userProgress.completedChallenges).to.include(testChallengeId.value);
      expect(userProgress.totalChallengesCompleted).to.equal(1);
      
      // Verify challenge type progress was updated
      const challengeType = challenge.challengeType;
      expect(userProgress.challengeProgressByType[challengeType]).to.exist;
      expect(userProgress.challengeProgressByType[challengeType].completed).to.equal(1);
      
      // Verify event data was properly passed
      const eventData = progressEventHandler.firstCall.args[0];
      expect(eventData.type).to.equal(EventTypes.CHALLENGE_COMPLETED);
      expect(eventData.payload.challengeId).to.equal(testChallengeId.value);
      expect(eventData.payload.userId).to.equal(testUserId.value);
      expect(eventData.payload.score).to.equal(evaluationData.overallScore);
    });
    
    it('should track skill progress based on challenge type', async function() {
      // Create a completed challenge with a specific skill focus
      const skillFocusChallenge = {
        id: createChallengeId('skill-challenge-123').value,
        userId: testUserId.value,
        title: 'Skill Challenge',
        difficulty: 'medium',
        challengeType: 'problem-solving',
        focusArea: 'critical-thinking',
        skills: ['analysis', 'problem-solving', 'decision-making'],
        content: { description: 'Test your critical thinking skills' },
        createdAt: new Date().toISOString()
      };
      challengeRepository.items[skillFocusChallenge.id] = skillFocusChallenge;
      
      // Create evaluation for the skill challenge
      const skillEvaluationId = createEvaluationId('skill-eval-123');
      
      // Trigger a challenge completed event with skills data
      await challengeService.markChallengeCompleted(
        createChallengeId(skillFocusChallenge.id),
        testUserId,
        90, // High score
        skillEvaluationId
      );
      
      // Verify the skills in progress were updated
      const userProgress = await progressRepository.findById(testUserId.value);
      
      // Check if skills from the challenge were added to progress
      skillFocusChallenge.skills.forEach(skill => {
        expect(userProgress.skills[skill]).to.exist;
        expect(userProgress.skills[skill].level).to.be.greaterThan(0);
        expect(userProgress.skills[skill].completedChallenges).to.include(skillFocusChallenge.id);
      });
      
      // Verify focus area is tracked
      expect(userProgress.focusAreas).to.include('critical-thinking');
    });
    
    it('should not update progress for a challenge already completed', async function() {
      // First completion
      await challengeService.markChallengeCompleted(
        testChallengeId,
        testUserId,
        85,
        testEvaluationId
      );
      
      // Verify first update
      let userProgress = await progressRepository.findById(testUserId.value);
      expect(userProgress.totalChallengesCompleted).to.equal(1);
      
      // Reset the spy to check second call
      progressEventHandler.resetHistory();
      
      // Try to complete the same challenge again
      await challengeService.markChallengeCompleted(
        testChallengeId,
        testUserId,
        90, // Different score
        createEvaluationId('new-evaluation-123')
      );
      
      // Verify the event handler was called again
      expect(progressEventHandler.called).to.be.true;
      
      // But progress should not double-count the challenge
      userProgress = await progressRepository.findById(testUserId.value);
      expect(userProgress.totalChallengesCompleted).to.equal(1);
      expect(userProgress.completedChallenges).to.have.lengthOf(1);
      expect(userProgress.completedChallenges).to.include(testChallengeId.value);
    });
    
    it('should update user streak when completing a challenge', async function() {
      // Mock the date to control streak calculation
      const today = new Date();
      const clock = sinon.useFakeTimers(today.getTime());
      
      // Complete a challenge
      await challengeService.markChallengeCompleted(
        testChallengeId,
        testUserId,
        85,
        testEvaluationId
      );
      
      // Verify streak started
      let userProgress = await progressRepository.findById(testUserId.value);
      expect(userProgress.streakDays).to.equal(1);
      expect(userProgress.lastActive).to.be.a('string');
      
      // Advance time by 24 hours
      clock.tick(24 * 60 * 60 * 1000);
      
      // Complete another challenge
      const newChallengeId = createChallengeId('challenge-next-day');
      challengeRepository.items[newChallengeId.value] = {
        id: newChallengeId.value,
        userId: testUserId.value,
        title: 'Next Day Challenge',
        difficulty: 'easy',
        challengeType: 'quiz',
        content: { description: 'Easy quiz challenge' },
        createdAt: new Date().toISOString()
      };
      
      await challengeService.markChallengeCompleted(
        newChallengeId,
        testUserId,
        90,
        createEvaluationId('eval-next-day')
      );
      
      // Verify streak increased
      userProgress = await progressRepository.findById(testUserId.value);
      expect(userProgress.streakDays).to.equal(2);
      
      // Restore the clock
      clock.restore();
    });
  });
}); 