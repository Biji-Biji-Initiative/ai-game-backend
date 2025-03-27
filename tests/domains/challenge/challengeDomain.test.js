/**
 * Challenge Domain Integration Tests
 * 
 * Tests the integration between the Challenge model, repository,
 * and domain events
 */

const { expect } = require('chai');
const sinon = require('sinon');
const Challenge = require('../../../src/core/challenge/models/Challenge');
const challengeRepository = require('../../../src/core/challenge/repositories/challengeRepository');
const domainEvents = require('../../../src/core/shared/domainEvents');
const testSetup = require('../setup');

describe('Challenge Domain Integration', function() {
  
  beforeEach(function() {
    testSetup.setup();
  });
  
  afterEach(function() {
    testSetup.teardown();
    sinon.restore();
  });
  
  it('should create and save a challenge using the repository', async function() {
    // Create a challenge
    const challenge = new Challenge({
      title: 'Effective Communication',
      content: 'Practice effective communication with AI assistants',
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
  
  it('should find challenges by user ID', async function() {
    // Create multiple challenges for the same user
    const challenge1 = new Challenge({
      title: 'Challenge 1',
      userId: 'test-user-1',
      focusArea: 'area-1'
    });
    
    const challenge2 = new Challenge({
      title: 'Challenge 2',
      userId: 'test-user-1',
      focusArea: 'area-2'
    });
    
    const challenge3 = new Challenge({
      title: 'Challenge 3',
      userId: 'test-user-2', // Different user
      focusArea: 'area-1'
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
  
  it('should find challenges by focus area', async function() {
    // Create multiple challenges with different focus areas
    const challenge1 = new Challenge({
      title: 'Challenge 1',
      userId: 'test-user-1',
      focusArea: 'effective-questioning'
    });
    
    const challenge2 = new Challenge({
      title: 'Challenge 2',
      userId: 'test-user-2',
      focusArea: 'effective-questioning' // Same focus area
    });
    
    const challenge3 = new Challenge({
      title: 'Challenge 3',
      userId: 'test-user-1',
      focusArea: 'clear-instructions' // Different focus area
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
  
  it('should update challenge properties correctly', async function() {
    // Create a challenge
    const challenge = new Challenge({
      title: 'Original Title',
      content: 'Original content',
      difficulty: 'easy',
      userId: 'test-user-1'
    });
    
    // Save the challenge
    const savedChallenge = await challengeRepository.save(challenge);
    
    // Update the challenge
    savedChallenge.update({
      title: 'Updated Title',
      difficulty: 'medium',
      // content should remain unchanged
    });
    
    // Save the updated challenge
    await challengeRepository.save(savedChallenge);
    
    // Retrieve the challenge again
    const updatedChallenge = await challengeRepository.findById(savedChallenge.id);
    
    // Verify the changes were saved
    expect(updatedChallenge.title).to.equal('Updated Title');
    expect(updatedChallenge.difficulty).to.equal('medium');
    expect(updatedChallenge.content).to.equal('Original content'); // Unchanged
    
    // Verify the updatedAt timestamp was updated
    expect(updatedChallenge.updatedAt).to.not.equal(updatedChallenge.createdAt);
  });
  
  it('should publish domain events when a challenge is completed', async function() {
    // Create a spy for the domain events publish method
    const publishSpy = sinon.spy(domainEvents, 'publish');
    
    // Create a challenge
    const challenge = new Challenge({
      title: 'Test Challenge',
      userId: 'test-user-1',
      focusArea: 'effective-questioning'
    });
    
    // Save the challenge
    const savedChallenge = await challengeRepository.save(challenge);
    
    // Mock a service that would handle challenge completion
    const completeChallenge = async (challenge, score) => {
      // Update the challenge
      challenge.complete(score);
      
      // Save the updated challenge
      await challengeRepository.save(challenge);
      
      // Publish the domain event
      await domainEvents.publish('ChallengeCompleted', {
        challengeId: challenge.id,
        userId: challenge.userId,
        focusArea: challenge.focusArea,
        score,
        completedAt: challenge.completedAt
      });
    };
    
    // Complete the challenge
    await completeChallenge(savedChallenge, 85);
    
    // Verify the challenge was updated
    const completedChallenge = await challengeRepository.findById(savedChallenge.id);
    expect(completedChallenge.completed).to.be.true;
    expect(completedChallenge.score).to.equal(85);
    expect(completedChallenge.completedAt).to.exist;
    
    // Verify the domain event was published
    expect(publishSpy.calledOnce).to.be.true;
    expect(publishSpy.firstCall.args[0]).to.equal('ChallengeCompleted');
    expect(publishSpy.firstCall.args[1].challengeId).to.equal(savedChallenge.id);
    expect(publishSpy.firstCall.args[1].userId).to.equal('test-user-1');
    expect(publishSpy.firstCall.args[1].focusArea).to.equal('effective-questioning');
    expect(publishSpy.firstCall.args[1].score).to.equal(85);
  });
  
  it('should filter and sort challenges using criteria', async function() {
    // Create challenges with various properties
    const challenges = [
      new Challenge({
        title: 'Easy Challenge',
        userId: 'test-user-1',
        difficulty: 'easy',
        active: true,
        type: 'scenario'
      }),
      new Challenge({
        title: 'Medium Challenge',
        userId: 'test-user-1',
        difficulty: 'medium',
        active: true,
        type: 'scenario'
      }),
      new Challenge({
        title: 'Hard Challenge',
        userId: 'test-user-1',
        difficulty: 'hard',
        active: false, // Inactive
        type: 'scenario'
      }),
      new Challenge({
        title: 'Quiz Challenge',
        userId: 'test-user-1',
        difficulty: 'medium',
        active: true,
        type: 'quiz'
      }),
      new Challenge({
        title: 'Other User Challenge',
        userId: 'test-user-2',
        difficulty: 'medium',
        active: true,
        type: 'scenario'
      })
    ];
    
    // Save all challenges
    for (const challenge of challenges) {
      await challengeRepository.save(challenge);
    }
    
    // Find active medium difficulty challenges for test-user-1
    const filteredChallenges = await challengeRepository.findByCriteria(
      {
        userId: 'test-user-1',
        difficulty: 'medium',
        active: true
      }, 
      {
        sortBy: 'title',
        sortOrder: 'asc'
      }
    );
    
    // Verify we found the correct challenges
    expect(filteredChallenges.length).to.equal(2);
    expect(filteredChallenges[0].title).to.equal('Medium Challenge');
    expect(filteredChallenges[1].title).to.equal('Quiz Challenge');
  });
}); 