import { expect } from "chai";
import testHelper from "../testHelper.js";
import domainEvents from "@/core/common/events/domainEvents.js";
import Challenge from "@/core/challenge/models/Challenge.js";
import FocusArea from "@/core/focusArea/models/FocusArea.js";
import challengeRepository from "@/core/challenge/repositories/challengeRepository.js";
import focusAreaRepository from "@/core/focusArea/repositories/focusAreaRepository.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@/core/challenge/errors/ChallengeErrors.js";
// Focus Area Progress Service for handling focus area updates
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
        try {
            // Find focus areas for the user
            const userFocusAreas = await this.focusAreaRepository.findByUserId(userId);
            // Find the specific focus area or create it if it doesn't exist
            let focusArea = userFocusAreas.find(area => area.name === focusAreaName);
            if (!focusArea) {
                focusArea = new FocusArea({
                    userId,
                    name: focusAreaName,
                    description: `Auto-generated focus area for ${focusAreaName}`,
                    priority: 2,
                    metadata: {
                        progress: 0,
                        challengeCount: 0
                    }
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
        catch (ChallengeError) {
            console.error('Error updating focus area progress:', error);
            throw error;
        }
    }
}
describe('Cross-Domain Workflow with Real APIs', function () {
    // Set longer timeout for real API calls
    this.timeout(30000);
    let testUser;
    let focusAreaProgressService;
    let focusAreaCompletedHandlerCalled = false;
    before(async function () {
        // Create test user
        testUser = await testHelper.setupTestUser();
        // Initialize services
        focusAreaProgressService = new FocusAreaProgressService(focusAreaRepository);
        // Register domain event handler
        domainEvents.registerHandler('ChallengeCompleted', async (event) => {
            const { data } = event;
            if (data.focusArea) {
                console.log(`ChallengeCompleted event received for focus area: ${data.focusArea}`);
                await focusAreaProgressService.updateProgress(data.userId, data.focusArea, data.score);
            }
        });
        // Register handler to track FocusAreaCompleted events
        domainEvents.registerHandler('FocusAreaCompleted', async (event) => {
            focusAreaCompletedHandlerCalled = true;
            console.log('FocusAreaCompleted event received:', event.data);
        });
        console.log(`Test setup complete. User ID: ${testUser.id}`);
    });
    after(async function () {
        // Clean up test data
        if (testUser && testUser.id) {
            await testHelper.cleanupTestData(testUser.id);
        }
    });
    it('should trigger focus area updates when a challenge is completed', async function () {
        // Create a focus area
        const focusArea = new FocusArea({
            userId: testUser.id,
            name: 'Data Interpretation',
            description: 'Analyzing and interpreting complex data with AI',
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
            userId: testUser.id,
            title: 'Data Interpretation Challenge',
            content: 'Practice interpreting complex data patterns',
            difficulty: 'medium',
            type: 'scenario',
            focusArea: 'Data Interpretation'
        });
        // Save the challenge
        await challengeRepository.save(challenge);
        // Get initial state of focus area
        const initialFocusArea = await focusAreaRepository.findById(focusArea.id);
        const initialProgress = initialFocusArea.metadata.progress;
        const initialChallengeCount = initialFocusArea.metadata.challengeCount;
        // Complete the challenge by publishing a ChallengeCompleted event
        await domainEvents.publish('ChallengeCompleted', {
            challengeId: challenge.id,
            userId: testUser.id,
            focusArea: challenge.focusArea,
            score: 85,
            completedAt: new Date().toISOString()
        });
        // Add a small delay to ensure event handlers complete
        await new Promise(resolve => setTimeout(resolve, 500));
        // Get updated focus area
        const updatedFocusArea = await focusAreaRepository.findById(focusArea.id);
        // Verify focus area was updated
        expect(updatedFocusArea.metadata.progress).to.be.greaterThan(initialProgress);
        expect(updatedFocusArea.metadata.challengeCount).to.equal(initialChallengeCount + 1);
        expect(updatedFocusArea.metadata.lastChallengeScore).to.equal(85);
        console.log(`Focus area progress updated from ${initialProgress} to ${updatedFocusArea.metadata.progress}`);
    });
    it('should trigger FocusAreaCompleted event when progress reaches 100%', async function () {
        // Reset flag
        focusAreaCompletedHandlerCalled = false;
        // Create a focus area that's almost complete
        const focusArea = new FocusArea({
            userId: testUser.id,
            name: 'AI Ethics',
            description: 'Understanding ethical considerations in AI',
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
            userId: testUser.id,
            title: 'Final AI Ethics Challenge',
            content: 'Demonstrate your understanding of ethical AI principles',
            difficulty: 'hard',
            type: 'scenario',
            focusArea: 'AI Ethics'
        });
        // Save the challenge
        await challengeRepository.save(challenge);
        // Complete the challenge with a high score
        await domainEvents.publish('ChallengeCompleted', {
            challengeId: challenge.id,
            userId: testUser.id,
            focusArea: challenge.focusArea,
            score: 95, // High score to push progress over 100%
            completedAt: new Date().toISOString()
        });
        // Add a small delay to ensure event handlers complete
        await new Promise(resolve => setTimeout(resolve, 500));
        // Get updated focus area
        const updatedFocusArea = await focusAreaRepository.findById(focusArea.id);
        // Verify focus area was marked as mastered
        expect(updatedFocusArea.metadata.progress).to.be.gte(100);
        expect(updatedFocusArea.metadata.mastered).to.be.true;
        expect(updatedFocusArea.metadata.masteredAt).to.exist;
        // Verify FocusAreaCompleted event was triggered
        expect(focusAreaCompletedHandlerCalled).to.be.true;
        console.log(`Focus area marked as mastered: ${updatedFocusArea.name}`);
    });
    it('should handle multiple challenges affecting different focus areas', async function () {
        // Create two focus areas
        const focusAreas = [
            new FocusArea({
                userId: testUser.id,
                name: 'Analytical Thinking',
                description: 'Developing analytical thinking skills',
                priority: 2,
                metadata: {
                    progress: 40,
                    challengeCount: 4
                }
            }),
            new FocusArea({
                userId: testUser.id,
                name: 'Strategic Planning',
                description: 'Learning strategic planning with AI',
                priority: 3,
                metadata: {
                    progress: 60,
                    challengeCount: 6
                }
            })
        ];
        // Save the focus areas
        for (const area of focusAreas) {
            await focusAreaRepository.save(area);
        }
        // Create challenges in different focus areas
        const challenges = [
            new Challenge({
                userId: testUser.id,
                title: 'Analytical Challenge',
                content: 'Test your analytical skills',
                focusArea: 'Analytical Thinking',
                type: 'scenario'
            }),
            new Challenge({
                userId: testUser.id,
                title: 'Strategic Challenge',
                content: 'Test your strategic planning',
                focusArea: 'Strategic Planning',
                type: 'scenario'
            })
        ];
        // Save the challenges
        for (const challenge of challenges) {
            await challengeRepository.save(challenge);
        }
        // Get initial state
        const initialAnalytical = await focusAreaRepository.findById(focusAreas[0].id);
        const initialStrategic = await focusAreaRepository.findById(focusAreas[1].id);
        // Complete both challenges
        for (const challenge of challenges) {
            await domainEvents.publish('ChallengeCompleted', {
                challengeId: challenge.id,
                userId: testUser.id,
                focusArea: challenge.focusArea,
                score: 80,
                completedAt: new Date().toISOString()
            });
            // Small delay between events
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        // Add a delay to ensure event handlers complete
        await new Promise(resolve => setTimeout(resolve, 500));
        // Get updated focus areas
        const updatedAnalytical = await focusAreaRepository.findById(focusAreas[0].id);
        const updatedStrategic = await focusAreaRepository.findById(focusAreas[1].id);
        // Verify both focus areas were updated
        expect(updatedAnalytical.metadata.progress).to.be.greaterThan(initialAnalytical.metadata.progress);
        expect(updatedAnalytical.metadata.challengeCount).to.equal(initialAnalytical.metadata.challengeCount + 1);
        expect(updatedStrategic.metadata.progress).to.be.greaterThan(initialStrategic.metadata.progress);
        expect(updatedStrategic.metadata.challengeCount).to.equal(initialStrategic.metadata.challengeCount + 1);
        console.log(`Updated multiple focus areas through domain events`);
    });
});
