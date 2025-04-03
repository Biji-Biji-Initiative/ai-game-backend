/**
 * Fight Card Endpoints
 * 
 * Mock implementations for fight card-related API endpoints
 */

import apiResponse, { ApiResponse } from '../../apiResponse';
import { FocusArea, Trait } from '@/store/useGameStore';

// Define types for request data
interface GenerateFightCardRequest {
  userEmail?: string;
  sessionId?: string;
  traits: Trait[];
  focus: FocusArea;
  responses?: {
    round1?: { userResponse: string; aiResponse?: string; challenge?: string };
    round2?: { userResponse: string; aiResponse?: string; challenge?: string };
    round3?: { userResponse: string; aiResponse?: string; challenge?: string };
  };
}

// Mock fight card generation
const generateFightCard = (data: GenerateFightCardRequest): ApiResponse => {
  // Create a unique ID for the fight card
  const fightCardId = 'fc_' + Math.random().toString(36).substring(2, 11);
  
  // Extract user traits and focus area
  const { traits, focus } = data;
  
  // Create a fight card based on the traits and focus area
  return apiResponse.success({
    id: fightCardId,
    createdAt: new Date().toISOString(),
    userTraits: traits,
    focusArea: focus,
    humanStrengths: [
      'Creativity',
      'Intuition',
      'Adaptability',
      'Ethical reasoning',
      'Emotional intelligence'
    ],
    aiStrengths: [
      'Processing speed',
      'Pattern recognition',
      'Memory retrieval',
      'Consistency',
      'Scalability'
    ],
    comparison: {
      creativity: {
        human: 85,
        ai: 65,
        advantage: 'human',
        description: 'Humans excel at generating novel, context-sensitive ideas'
      },
      precision: {
        human: 70,
        ai: 95,
        advantage: 'ai',
        description: 'AI excels at consistent, error-free execution of tasks'
      },
      adaptability: {
        human: 90,
        ai: 60,
        advantage: 'human',
        description: 'Humans can quickly adapt to new situations with limited information'
      }
    }
  });
};

// Get a fight card by ID
const getFightCard = (fightCardId: string): ApiResponse => {
  // In a real implementation, this would fetch fight card data from a database
  // For mock purposes, we'll just return a fight card object with the provided ID
  return apiResponse.success({
    id: fightCardId,
    createdAt: new Date().toISOString(),
    userTraits: [
      { id: 'trait1', name: 'Creativity', value: 8, description: 'Ability to create novel ideas' },
      { id: 'trait2', name: 'Adaptability', value: 7, description: 'Ability to adjust to new situations' }
    ],
    focusArea: {
      id: 'focus1',
      name: 'Creative Problem Solving',
      description: 'Finding innovative solutions to complex problems',
      matchLevel: 90
    },
    humanStrengths: [
      'Creativity',
      'Intuition',
      'Adaptability',
      'Ethical reasoning',
      'Emotional intelligence'
    ],
    aiStrengths: [
      'Processing speed',
      'Pattern recognition',
      'Memory retrieval',
      'Consistency',
      'Scalability'
    ],
    comparison: {
      creativity: {
        human: 85,
        ai: 65,
        advantage: 'human',
        description: 'Humans excel at generating novel, context-sensitive ideas'
      },
      precision: {
        human: 70,
        ai: 95,
        advantage: 'ai',
        description: 'AI excels at consistent, error-free execution of tasks'
      },
      adaptability: {
        human: 90,
        ai: 60,
        advantage: 'human',
        description: 'Humans can quickly adapt to new situations with limited information'
      }
    }
  });
};

// Export all fight card endpoints
const fightCardEndpoints = {
  generateFightCard,
  getFightCard,
};

export default fightCardEndpoints;
