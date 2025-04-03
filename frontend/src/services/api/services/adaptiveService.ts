/**
 * Adaptive Service
 * 
 * Provides hooks for adaptive/personalized features like dynamic challenge generation
 * and personalized recommendations.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Challenge } from './challengeService';
import { FocusArea, Trait } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

// Types
export interface GenerateDynamicChallengeRequest {
  userId?: string;
  focusArea?: FocusArea;
  traits?: Trait[];
  completedChallengeIds?: string[];
  preferredDifficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface AdaptiveRecommendation {
  id: string;
  type: 'challenge' | 'focus_area' | 'skill_development' | 'resource';
  title: string;
  description: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    challengeId?: string;
    difficulty?: string;
    focusAreaId?: string;
    skillId?: string;
    resourceUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * Hook to generate a dynamic challenge based on user context
 * 
 * @returns Mutation for generating a personalized challenge
 */
export const useGenerateDynamicChallenge = () => {
  return useMutation<ApiResponse<Challenge>, Error, GenerateDynamicChallengeRequest>({
    mutationFn: async (request) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Generate a dynamic challenge based on user context
      // In a real app, this would call the API with the user's context
      
      console.log('Generating dynamic challenge with context:', request);
      
      // Create a mock challenge that appears tailored to the user
      const challenge: Challenge = {
        id: `dynamic-challenge-${Date.now()}`,
        title: request.focusArea?.name 
          ? `Advanced ${request.focusArea.name} Challenge` 
          : 'Personalized Challenge',
        description: `This challenge is specifically designed for your profile, focusing on ${
          request.traits && request.traits.length > 0 
            ? `strengthening your ${request.traits[0].name} capabilities` 
            : 'developing your unique human edge skills'
        }. ${
          request.focusArea 
            ? `It will help you excel in ${request.focusArea.name}.` 
            : 'It will help you discover your optimal focus area.'
        }`,
        difficulty: request.preferredDifficulty || 'Medium',
        category: request.focusArea?.name || 'Adaptive Learning',
        estimatedTime: '25 min',
        matchScore: 95, // High match score for a personalized challenge
        tags: [
          'adaptive', 
          'personalized',
          ...(request.focusArea ? [request.focusArea.name.toLowerCase().replace(/\s+/g, '-')] : []),
          ...(request.traits && request.traits.length > 0 
            ? [request.traits[0].name.toLowerCase().replace(/\s+/g, '-')] 
            : [])
        ]
      };
      
      return {
        success: true,
        status: 200,
        data: challenge
      };
    }
  });
};

/**
 * Hook to get adaptive recommendations for a user
 * 
 * @param userId The user ID to get recommendations for
 * @param limit Maximum number of recommendations to return
 * @param enabled Whether the query should execute automatically
 * @returns Query with adaptive recommendations
 */
export const useGetAdaptiveRecommendations = (
  userId?: string, 
  limit: number = 3, 
  enabled: boolean = true
) => {
  return useQuery<ApiResponse<AdaptiveRecommendation[]>, Error>({
    queryKey: ['adaptiveRecommendations', userId, limit],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock recommendations
      const mockRecommendations: AdaptiveRecommendation[] = [
        {
          id: 'rec-1',
          type: 'challenge',
          title: 'Critical Thinking Challenge',
          description: 'This challenge will test your ability to analyze AI-generated content',
          rationale: 'Based on your high scores in analytical thinking and critical evaluation',
          priority: 'high',
          metadata: {
            challengeId: 'challenge-3',
            difficulty: 'Medium'
          }
        },
        {
          id: 'rec-2',
          type: 'focus_area',
          title: 'Explore Ethical AI Leadership',
          description: 'Consider focusing on Ethical AI Leadership to leverage your strengths',
          rationale: 'Your traits show strong ethical reasoning and leadership capabilities',
          priority: 'medium',
          metadata: {
            focusAreaId: 'focus-2'
          }
        },
        {
          id: 'rec-3',
          type: 'skill_development',
          title: 'Improve Contextual Understanding',
          description: 'Practice recognizing context and nuance in AI interactions',
          rationale: 'This will complement your existing strengths in critical thinking',
          priority: 'medium',
          metadata: {
            skillId: 'skill-4'
          }
        },
        {
          id: 'rec-4',
          type: 'resource',
          title: 'AI Collaboration Techniques',
          description: 'Learn advanced methods for human-AI collaboration',
          rationale: 'Will help you build on your creative collaboration capabilities',
          priority: 'low',
          metadata: {
            resourceUrl: 'https://example.com/ai-collaboration'
          }
        }
      ];
      
      // Return limited recommendations
      return {
        success: true,
        status: 200,
        data: mockRecommendations.slice(0, limit)
      };
    },
    enabled: enabled && !!userId
  });
}; 