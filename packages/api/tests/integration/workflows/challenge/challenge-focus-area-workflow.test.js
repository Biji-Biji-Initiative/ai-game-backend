import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import Challenge from '@tests/src/core/challenge/models/Challenge.js';
import FocusArea from '@tests/src/core/focusArea/models/FocusArea.js';
import challengeRepository from '@tests/src/core/challenge/repositories/challengeRepository.js';
import focusAreaRepository from '@tests/src/core/focusArea/repositories/focusAreaRepository.js';
import domainEvents from '@tests/src/core/common/events/domainEvents.js';
import testSetup from "../setup.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from '@tests/src/core/challenge/errors/ChallengeErrors.js';
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@tests/src/core/challenge/errors/ChallengeErrors.js";
// Mock service implementations
/**
 *
 */
class ChallengeService {
    /**
     *
     */
    constructor(challengeRepository) {
        this.challengeRepository = challengeRepository;
    }
    /**
     *
     */
    async completeChallenge(challengeId, userId, response, score) {
        // Get the challenge
        const challenge = await this.challengeRepository.findById(challengeId);
        if (!challenge) {
            throw new ChallengeNotFoundError(`Challenge not found with ID: ${challengeId}`);
        }
        // Update challenge state
        challenge.complete(score);
        // Save the updated challenge
        await this.challengeRepository.save(challenge);
        // Publish domain event
        await domainEvents.publish('ChallengeCompleted', {
            challengeId: challenge.id,
            userId: challenge.userId,
            focusArea: challenge.focusArea,
            score,
            response,
            completedAt: challenge.completedAt
        });
        return challenge;
    }
}
/**
 *
 */
class FocusAreaProgressService {
    /**
     *
     */
    constructor(focusAreaRepository) {
        this.focusAreaRepository = focusAreaRepository;
    }
    /**
     *
     */
    async updateProgress(userId, focusAreaName, score) {
        // Find focus areas for the user
        const userFocusAreas = await this.focusAreaRepository.findByUserId(userId);
        // Find the specific focus area or create it if it doesn't exist
        let focusArea = userFocusAreas.find(area => area.name === focusAreaName);
        if (!focusArea) {
            focusArea = new FocusArea({
                userId,
                name: focusAreaName,
                description: `Auto-generated focus area for ${focusAreaName}`,
                priority: 2
            });
        }
        // Update metadata with progress information
        const currentProgress = focusArea.metadata.progress || 0;
        const challengeCount = focusArea.metadata.challengeCount || 0;
        focusArea.update({
            metadata: {
                ...focusArea.metadata,
                progress: Math.min(100, currentProgress + (score / 100) * 10), // Increase progress based on score
                challengeCount: challengeCount + 1,
                lastChallengeScore: score,
                lastUpdated: new Date().toISOString()
            }
        });
        // Check if the focus area is completed
        if (focusArea.metadata.progress >= 100) {
            // Mark as mastered by adding to metadata
            focusArea.update({
                metadata: {
                    ...focusArea.metadata,
                    mastered: true,
                    masteredAt: new Date().toISOString()
                }
            });
            // Publish event for focus area completion
            await domainEvents.publish('FocusAreaCompleted', {
                focusAreaId: focusArea.id,
                userId,
                name: focusArea.name
            });
        }
        // Save the updated focus area
        await this.focusAreaRepository.save(focusArea);
        return focusArea;
    }
}
describe('Challenge and Focus Area Cross-Domain Integration', function () {
    let challengeService;
    let focusAreaProgressService;
    beforeEach(function () {
        testSetup.setup();
        // Initialize services
        challengeService = new ChallengeService(challengeRepository);
        focusAreaProgressService = new FocusAreaProgressService(focusAreaRepository);
        // Register domain event handler
        domainEvents.registerHandler('ChallengeCompleted', async (event) => {
            const { data } = event;
            if (data.focusArea) {
                await focusAreaProgressService.updateProgress(data.userId, data.focusArea, data.score);
            }
        });
    });
    afterEach(function () {
        testSetup.teardown();
        sinon.restore();
    });
    it('should update focus area progress when challenge is completed', async function () {
        // Create a user
        const userId = 'test-user-1';
        // Create a focus area
        const focusArea = new FocusArea({
            userId,
            name: 'effective-questioning',
            description: 'Learning to ask effective questions',
            priority: 1,
            metadata: {
                progress: 50, // Starting at 50% progress
                challengeCount: 5
            }
        });
        // Save the focus area
        await focusAreaRepository.save(focusArea);
        // Create a challenge in the same focus area
        const challenge = new Challenge({
            userId,
            title: 'Question Formulation Exercise',
            content: 'Practice formulating clear and specific questions',
            difficulty: 'medium',
            focusArea: 'effective-questioning',
            type: 'exercise'
        });
        // Save the challenge
        await challengeRepository.save(challenge);
        // Spy on domain events
        const publishSpy = sinon.spy(domainEvents, 'publish');
        // Complete the challenge with a good score
        await challengeService.completeChallenge(challenge.id, userId, 'This is my response to the challenge', 85 // Good score
        );
        // Verify event was published
        expect(publishSpy.calledWith('ChallengeCompleted')).to.be.true;
        // Get the updated focus area
        const updatedFocusArea = await focusAreaRepository.findById(focusArea.id);
        // Verify focus area progress was updated
        expect(updatedFocusArea.metadata.progress).to.be.greaterThan(50); // Progress increased
        expect(updatedFocusArea.metadata.challengeCount).to.equal(6); // Challenge count increased
        expect(updatedFocusArea.metadata.lastChallengeScore).to.equal(85);
    });
    it('should publish FocusAreaCompleted event when progress reaches 100%', async function () {
        // Create a user
        const userId = 'test-user-2';
        // Create a focus area that's almost complete
        const focusArea = new FocusArea({
            userId,
            name: 'clear-instructions',
            description: 'Learning to give clear instructions to AI',
            priority: 1,
            metadata: {
                progress: 95, // Almost complete
                challengeCount: 9
            }
        });
        // Save the focus area
        await focusAreaRepository.save(focusArea);
        // Create a challenge in the same focus area
        const challenge = new Challenge({
            userId,
            title: 'Final Instruction Exercise',
            content: 'Master giving clear instructions to AI',
            difficulty: 'hard',
            focusArea: 'clear-instructions',
            type: 'exercise'
        });
        // Save the challenge
        await challengeRepository.save(challenge);
        // Set up a spy for the FocusAreaCompleted event
        const focusAreaCompletedHandler = sinon.spy();
        domainEvents.registerHandler('FocusAreaCompleted', focusAreaCompletedHandler);
        // Complete the challenge with a high score
        await challengeService.completeChallenge(challenge.id, userId, 'My excellent final response', 95 // High score to ensure completion
        );
        // Get the updated focus area
        const updatedFocusArea = await focusAreaRepository.findById(focusArea.id);
        // Verify focus area was marked as mastered
        expect(updatedFocusArea.metadata.progress).to.be.gte(100);
        expect(updatedFocusArea.metadata.mastered).to.be.true;
        expect(updatedFocusArea.metadata.masteredAt).to.exist;
        // Verify FocusAreaCompleted event was published
        expect(focusAreaCompletedHandler.calledOnce).to.be.true;
        const eventData = focusAreaCompletedHandler.firstCall.args[0].data;
        expect(eventData.focusAreaId).to.equal(focusArea.id);
        expect(eventData.userId).to.equal(userId);
        expect(eventData.name).to.equal('clear-instructions');
    });
    it('should handle multiple challenges affecting the same focus area', async function () {
        // Create a user
        const userId = 'test-user-3';
        // Create a focus area
        const focusArea = new FocusArea({
            userId,
            name: 'data-analysis',
            description: 'Analyzing and interpreting data with AI',
            priority: 2,
            metadata: {
                progress: 30,
                challengeCount: 3
            }
        });
        // Save the focus area
        await focusAreaRepository.save(focusArea);
        // Create multiple challenges in the same focus area
        const challenge1 = new Challenge({
            userId,
            title: 'Data Analysis Challenge 1',
            content: 'Basic data interpretation',
            difficulty: 'easy',
            focusArea: 'data-analysis',
            type: 'exercise'
        });
        const challenge2 = new Challenge({
            userId,
            title: 'Data Analysis Challenge 2',
            content: 'Intermediate data analysis',
            difficulty: 'medium',
            focusArea: 'data-analysis',
            type: 'scenario'
        });
        // Save the challenges
        await challengeRepository.save(challenge1);
        await challengeRepository.save(challenge2);
        // Complete the first challenge
        await challengeService.completeChallenge(challenge1.id, userId, 'My response to challenge 1', 75);
        // Get the focus area after first challenge
        const focusAreaAfterFirst = await focusAreaRepository.findById(focusArea.id);
        const progressAfterFirst = focusAreaAfterFirst.metadata.progress;
        // Complete the second challenge
        await challengeService.completeChallenge(challenge2.id, userId, 'My response to challenge 2', 85);
        // Get the focus area after second challenge
        const focusAreaAfterSecond = await focusAreaRepository.findById(focusArea.id);
        const progressAfterSecond = focusAreaAfterSecond.metadata.progress;
        // Verify progressive updates
        expect(progressAfterFirst).to.be.greaterThan(30); // Initial progress
        expect(progressAfterSecond).to.be.greaterThan(progressAfterFirst); // Second update increased it further
        expect(focusAreaAfterSecond.metadata.challengeCount).to.equal(5); // 3 initial + 2 new challenges
        expect(focusAreaAfterSecond.metadata.lastChallengeScore).to.equal(85); // Latest score
    });
});
