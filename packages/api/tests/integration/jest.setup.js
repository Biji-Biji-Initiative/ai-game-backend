/**
 * Jest Integration Tests Setup
 * 
 * This file contains shared setup and utilities for integration tests.
 * It provides common test patterns and mocks needed across integration tests.
 */

import { jest } from '@jest/globals';
import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

// Configure Chai to work with Sinon and promises
chai.use(sinonChai);
chai.use(chaiAsPromised);

export const { expect } = chai;

// Common test constants
export const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
export const TEST_USER_EMAIL = 'test@example.com';
export const TEST_PERSONALITY_ID = '123e4567-e89b-12d3-a456-426614174001';
export const TEST_CHALLENGE_ID = '123e4567-e89b-12d3-a456-426614174002';
export const TEST_FOCUS_AREA_ID = '123e4567-e89b-12d3-a456-426614174003';

// Mock repositories for testing
export class MockUserRepository {
  constructor() {
    this.users = new Map();
  }
  
  async findById(id) {
    return this.users.get(id) || null;
  }
  
  async findByEmail(email) {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }
  
  async save(user) {
    this.users.set(user.id, { ...user });
    return user;
  }
  
  async update(id, userData) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async delete(id) {
    return this.users.delete(id);
  }
}

export class MockPersonalityRepository {
  constructor() {
    this.personalities = new Map();
  }
  
  async findById(id) {
    return this.personalities.get(id) || null;
  }
  
  async findByUserId(userId) {
    return Array.from(this.personalities.values()).find(p => p.userId === userId) || null;
  }
  
  async save(personality) {
    this.personalities.set(personality.id, { ...personality });
    return personality;
  }
  
  async update(id, personalityData) {
    const personality = this.personalities.get(id);
    if (!personality) return null;
    
    const updatedPersonality = { ...personality, ...personalityData };
    this.personalities.set(id, updatedPersonality);
    return updatedPersonality;
  }
}

export class MockChallengeRepository {
  constructor() {
    this.challenges = new Map();
  }
  
  async findById(id) {
    return this.challenges.get(id) || null;
  }
  
  async findByUserId(userId) {
    return Array.from(this.challenges.values()).filter(c => c.userId === userId);
  }
  
  async save(challenge) {
    this.challenges.set(challenge.id, { ...challenge });
    return challenge;
  }
  
  async update(id, challengeData) {
    const challenge = this.challenges.get(id);
    if (!challenge) return null;
    
    const updatedChallenge = { ...challenge, ...challengeData };
    this.challenges.set(id, updatedChallenge);
    return updatedChallenge;
  }
}

// Mock OpenAI service
export const mockOpenAIService = {
  generateChatCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked OpenAI response' } }]
  }),
  generateCompletion: jest.fn().mockResolvedValue({
    choices: [{ text: 'Mocked OpenAI completion' }]
  })
};

// Reset all mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  sinon.restore();
});

// Test helpers
export function createTestUser(overrides = {}) {
  return {
    id: TEST_USER_ID,
    email: TEST_USER_EMAIL,
    name: 'Test User',
    preferences: {},
    ...overrides
  };
}

export function createTestPersonality(overrides = {}) {
  return {
    id: TEST_PERSONALITY_ID,
    userId: TEST_USER_ID,
    traits: ['focused', 'analytical'],
    learningStyle: 'visual',
    ...overrides
  };
}

export function createTestChallenge(overrides = {}) {
  return {
    id: TEST_CHALLENGE_ID,
    userId: TEST_USER_ID,
    focusAreaId: TEST_FOCUS_AREA_ID,
    prompt: 'Test challenge prompt',
    difficulty: 'medium',
    status: 'pending',
    ...overrides
  };
}

// Validation helpers
export function hasValidId(obj) {
  return typeof obj.id === 'string' && obj.id.length > 0;
}

export function hasValidTimestamps(obj) {
  return (
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    obj.createdAt <= obj.updatedAt
  );
}

// Container helper to create a testing container with mocks
export function createTestContainer(mocks = {}) {
  const container = {
    resolve: name => {
      if (name in mocks) {
        return mocks[name];
      }
      throw new Error(`Service not mocked: ${name}`);
    }
  };
  
  return container;
} 