import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import Challenge from "../../../src/core/challenge/models/Challenge.js";
import { createUserId, createChallengeId, UserId, ChallengeId } from "../../../src/core/common/valueObjects/index.js";
import domainEvents from "../../../src/core/common/events/domainEvents.js";
import testSetup from "../setup.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "../../../src/core/challenge/errors/ChallengeErrors.js";

describe('Challenge Domain Integration', function () {
    let challengeRepository;
    let testUserId;
    let testChallengeId;
    let domainEvents;
    let sandbox;

    beforeEach(function () {
        // Set up test environment with in-memory repositories
        const setup = testSetup.setup();
        challengeRepository = setup.challengeRepository;
        domainEvents = setup.domainEvents;
        sandbox = setup.sandbox;
        // Add spy for domain events
        sandbox.spy(domainEvents, 'publish');

        // Create Value Objects for testing
        testUserId = createUserId(uuidv4());
        testChallengeId = createChallengeId(uuidv4());

        // Mock the repository
        challengeRepository = {
            challenges: new Map(),
            save: async function (challenge) {
                const id = challenge.id || testChallengeId.value;
                const savedChallenge = { ...challenge, id };
                this.challenges.set(id, savedChallenge);
                return savedChallenge;
            },
            findById: async function (id) {
                return this.challenges.get(id instanceof ChallengeId ? id.value : id);
            },
            update: async function (id, updates) {
                const challenge = await this.findById(id);
                if (!challenge) throw new ChallengeNotFoundError(`Challenge not found`);
                const updatedChallenge = { ...challenge, ...updates };
                this.challenges.set(id instanceof ChallengeId ? id.value : id, updatedChallenge);
                return updatedChallenge;
            }
        };

        // Mock domain events
        mockDomainEvents.publish = sinon.stub().resolves();;
    });

    afterEach(function () {
        testSetup.teardown(sandbox);
        sinon.restore();
    });

    it('should create and save a challenge using the repository', async function () {
        // Create a challenge
        const challenge = new Challenge({
            title: 'Effective Communication',
            content: {
                description: 'Practice effective communication with AI assistants',
                instructions: 'Complete this task...'
            },
            difficulty: 'medium',
            type: 'scenario',
            userId: 'test-user-1',
            focusArea: 'effective-communication'
        });
        // Save the challenge
        const savedChallenge = await challengeRepository.save(challenge);
        // Verify the challenge was saved with an ID
        expect(savedChallenge.id).to.exist;
        expect(savedChallenge.title).to.equal('Effective Communication');
        // Verify we can retrieve the challenge from the repository
        const retrievedChallenge = await challengeRepository.findById(savedChallenge.id);
        expect(retrievedChallenge).to.exist;
        expect(retrievedChallenge.title).to.equal('Effective Communication');
        expect(retrievedChallenge.userId).to.equal('test-user-1');
    });

    it('should find challenges by user ID', async function () {
        // Create multiple challenges for the same user
        const challenge1 = new Challenge({
            title: 'Challenge 1',
            userId: 'test-user-1',
            focusArea: 'area-1',
            content: {
                description: 'Description 1',
                instructions: 'Instructions 1'
            }
        });
        const challenge2 = new Challenge({
            title: 'Challenge 2',
            userId: 'test-user-1',
            focusArea: 'area-2',
            content: {
                description: 'Description 2',
                instructions: 'Instructions 2'
            }
        });
        const challenge3 = new Challenge({
            title: 'Challenge 3',
            userId: 'test-user-2', // Different user
            focusArea: 'area-1',
            content: {
                description: 'Description 3',
                instructions: 'Instructions 3'
            }
        });
        // Save all challenges
        await challengeRepository.save(challenge1);
        await challengeRepository.save(challenge2);
        await challengeRepository.save(challenge3);
        // Find challenges for test-user-1
        const userChallenges = await challengeRepository.findByUserId('test-user-1');
        // Verify we found the correct challenges
        expect(userChallenges.length).to.equal(2);
        const titles = userChallenges.map(c => c.title);
        expect(titles).to.include('Challenge 1');
        expect(titles).to.include('Challenge 2');
        expect(titles).to.not.include('Challenge 3');
    });

    it('should find challenges by focus area', async function () {
        // Create multiple challenges with different focus areas
        const challenge1 = new Challenge({
            title: 'Challenge 1',
            userId: 'test-user-1',
            focusArea: 'effective-questioning',
            content: {
                description: 'Description 1',
                instructions: 'Instructions 1'
            }
        });
        const challenge2 = new Challenge({
            title: 'Challenge 2',
            userId: 'test-user-2',
            focusArea: 'effective-questioning', // Same focus area
            content: {
                description: 'Description 2',
                instructions: 'Instructions 2'
            }
        });
        const challenge3 = new Challenge({
            title: 'Challenge 3',
            userId: 'test-user-1',
            focusArea: 'clear-instructions', // Different focus area
            content: {
                description: 'Description 3',
                instructions: 'Instructions 3'
            }
        });
        // Save all challenges
        await challengeRepository.save(challenge1);
        await challengeRepository.save(challenge2);
        await challengeRepository.save(challenge3);
        // Find challenges for the focus area
        const focusAreaChallenges = await challengeRepository.findByFocusArea('effective-questioning');
        // Verify we found the correct challenges
        expect(focusAreaChallenges.length).to.equal(2);
        const titles = focusAreaChallenges.map(c => c.title);
        expect(titles).to.include('Challenge 1');
        expect(titles).to.include('Challenge 2');
        expect(titles).to.not.include('Challenge 3');
    });

    it('should update challenge properties correctly', async function () {
        // Create a challenge with Value Objects
        const challenge = new Challenge({
            title: 'Original Title',
            content: {
                description: 'Original content',
                instructions: 'Original instructions'
            },
            difficulty: 'easy',
            userId: testUserId
        });
        
        // Save the challenge
        const savedChallenge = await challengeRepository.save(challenge);
        
        // Update the challenge directly through repository using Value Object
        const updatedChallenge = await challengeRepository.update(
            createChallengeId(savedChallenge.id),
            {
                title: 'Updated Title',
                difficulty: 'medium',
                // content should remain unchanged
            }
        );
        
        // Retrieve the challenge again using Value Object
        const retrievedChallenge = await challengeRepository.findById(createChallengeId(savedChallenge.id));
        
        // Verify the changes were saved
        expect(retrievedChallenge.title).to.equal('Updated Title');
        expect(retrievedChallenge.difficulty).to.equal('medium');
        expect(retrievedChallenge.content.description).to.equal('Original content'); // Unchanged
    });

    it('should publish domain events when a challenge is completed', async function () {
        // Create a challenge with Value Objects
        const challenge = new Challenge({
            title: 'Test Challenge',
            userId: testUserId,
            focusArea: 'effective-questioning',
            content: {
                description: 'Test content',
                instructions: 'Test instructions'
            }
        });
        
        // Save the challenge
        const savedChallenge = await challengeRepository.save(challenge);
        const challengeId = createChallengeId(savedChallenge.id);
        
        // Mock a service that would handle challenge completion
        const completeChallenge = async (challengeId, score) => {
            // Get the challenge using Value Object
            const challenge = await challengeRepository.findById(challengeId);
            
            // Update the challenge using Value Object
            const updatedChallenge = await challengeRepository.update(challengeId, {
                completed: true,
                completedAt: new Date().toISOString(),
                score
            });
            
            // Publish the domain event with Value Objects
            await domainEvents.publish('ChallengeCompleted', {
                challengeId: challengeId.value,
                userId: challenge.userId instanceof UserId ? challenge.userId.value : challenge.userId,
                focusArea: challenge.focusArea,
                score,
                completedAt: updatedChallenge.completedAt
            });
            
            return updatedChallenge;
        };
        
        // Complete the challenge using Value Object
        const completedChallenge = await completeChallenge(challengeId, 85);
        
        // Verify the challenge was updated
        expect(completedChallenge.completed).to.be.true;
        expect(completedChallenge.score).to.equal(85);
        expect(completedChallenge.completedAt).to.exist;
        
        // Verify the domain event was published with correct Value Object IDs
        expect(domainEvents.publish.calledOnce).to.be.true;
        expect(domainEvents.publish.firstCall.args[0]).to.equal('ChallengeCompleted');
        const eventData = domainEvents.publish.firstCall.args[1];
        expect(eventData.challengeId).to.equal(challengeId.value);
        expect(eventData.userId).to.equal(testUserId.value);
    });
});
