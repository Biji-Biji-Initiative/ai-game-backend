import { ApiResponse } from '../interfaces/api-client';
import { Challenge } from '../interfaces/models';
import { ChallengeService } from '../interfaces/services';
import { Trait } from '../services/traitsService';

/**
 * Mock implementation of the ChallengeService
 */
export class MockChallengeService implements ChallengeService {
  private challenges: Challenge[] = [
    {
      id: '1',
      title: 'Critical Thinking Challenge',
      description: 'Analyze a complex scenario and provide a well-reasoned response.',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      difficulty: 'medium',
      tags: ['critical-thinking', 'problem-solving'],
      responses: []
    },
    {
      id: '2',
      title: 'Communication Challenge',
      description: 'Craft a persuasive argument for a given topic.',
      createdBy: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      difficulty: 'easy',
      tags: ['communication', 'persuasion'],
      responses: []
    },
    {
      id: '3',
      title: 'Creativity Challenge',
      description: 'Generate innovative solutions to a common problem.',
      createdBy: '3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      difficulty: 'hard',
      tags: ['creativity', 'innovation'],
      responses: []
    }
  ];

  private traits: Trait[] = [
    {
      id: 'trait-1',
      name: 'Critical Thinking',
      description: 'The objective analysis and evaluation of an issue in order to form a judgment',
      category: 'cognitive',
      score: 85
    },
    {
      id: 'trait-2',
      name: 'Creativity',
      description: 'The use of imagination or original ideas to create something',
      category: 'cognitive',
      score: 70
    },
    {
      id: 'trait-3',
      name: 'Adaptability',
      description: 'The quality of being able to adjust to new conditions',
      category: 'behavioral',
      score: 75
    }
  ];

  async getChallenges(filters?: { difficulty?: string; tags?: string[]; search?: string }): Promise<ApiResponse<Challenge[]>> {
    let filteredChallenges = [...this.challenges];

    if (filters?.difficulty) {
      filteredChallenges = filteredChallenges.filter(
        challenge => challenge.difficulty === filters.difficulty
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      const filterTags = filters.tags;
      filteredChallenges = filteredChallenges.filter(
        challenge =>
          challenge.tags &&
          filterTags &&
          filterTags.some(tag => challenge.tags.includes(tag))
      );
    }

    if (filters?.search) {
      const searchTerms = filters.search.toLowerCase();
      filteredChallenges = filteredChallenges.filter(
        challenge => 
          challenge.title.toLowerCase().includes(searchTerms) ||
          (challenge.description?.toLowerCase().includes(searchTerms) ?? false)
      );
    }

    return {
      data: filteredChallenges,
      error: null,
      status: 200,
      ok: true
    };
  }

  async getChallengeById(id: string): Promise<ApiResponse<Challenge>> {
    const challenge = this.challenges.find(c => c.id === id);
    return {
      data: challenge,
      error: challenge ? null : { message: 'Challenge not found' },
      status: challenge ? 200 : 404,
      ok: !!challenge
    };
  }

  async createChallenge(challenge: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Challenge>> {
    const newChallenge = {
      ...challenge,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };
    this.challenges.push(newChallenge);
    return {
      data: newChallenge,
      error: null,
      status: 201,
      ok: true
    };
  }

  async updateChallenge(id: string, challenge: Partial<Challenge>): Promise<ApiResponse<Challenge>> {
    const index = this.challenges.findIndex(c => c.id === id);
    if (index === -1) {
      return {
        data: null,
        error: { message: 'Challenge not found' },
        status: 404,
        ok: false
      };
    }

    this.challenges[index] = {
      ...this.challenges[index],
      ...challenge,
      updatedAt: new Date().toISOString()
    };

    return {
      data: this.challenges[index],
      error: null,
      status: 200,
      ok: true
    };
  }

  async deleteChallenge(id: string): Promise<ApiResponse<void>> {
    const index = this.challenges.findIndex(c => c.id === id);
    if (index === -1) {
      return {
        data: null,
        error: { message: 'Challenge not found' },
        status: 404,
        ok: false
      };
    }

    this.challenges.splice(index, 1);
    return {
      data: undefined,
      error: null,
      status: 204,
      ok: true
    };
  }

  async getChallengeForRound(round: number): Promise<ApiResponse<Challenge>> {
    const challenge = this.challenges[round - 1];
    return {
      data: challenge,
      error: challenge ? null : { message: 'No challenge found for this round' },
      status: challenge ? 200 : 404,
      ok: !!challenge
    };
  }

  async submitChallengeResponse(challengeId: string, response: Record<string, unknown>): Promise<ApiResponse<void>> {
    const challenge = this.challenges.find(c => c.id === challengeId);
    if (!challenge) {
      return {
        data: null,
        error: { message: 'Challenge not found' },
        status: 404,
        ok: false
      };
    }

    // In a real implementation, we would save the response to a database
    if (!challenge.responses) {
      challenge.responses = [];
    }
    challenge.responses.push({
      userId: '1', // In a real implementation, this would be the current user's ID
      response,
      createdAt: new Date().toISOString()
    });

    return {
      data: undefined,
      error: null,
      status: 200,
      ok: true
    };
  }

  /**
   * Get all available traits
   */
  async getTraits(): Promise<ApiResponse<Trait[]>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: this.traits,
      error: null,
      status: 200,
      ok: true
    };
  }
}
