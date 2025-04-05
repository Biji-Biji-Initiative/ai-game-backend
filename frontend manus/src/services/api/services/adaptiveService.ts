/**
 * Adaptive Service
 * 
 * Provides hooks for adaptive/personalized features like dynamic challenge generation
 * and personalized recommendations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';
import { schemas } from '@/lib/api/generated-zodios-client';
import { v4 as uuidv4 } from 'uuid';

// Adaptive keys for React Query
const adaptiveKeys = {
  all: ['adaptive'] as const,
  recommendations: (userId?: string, limit?: number) => 
    [...adaptiveKeys.all, 'recommendations', userId, limit] as const,
  dynamicChallenges: () => 
    [...adaptiveKeys.all, 'dynamicChallenges'] as const,
};

// --- Define types based on Zodios schemas ---

// Import Challenge and AdaptiveRecommendation from Zodios schemas
export type ApiChallenge = z.infer<typeof schemas.Challenge>;
export type AdaptiveRecommendation = z.infer<typeof schemas.AdaptiveRecommendation>;

// Define GenerateDynamicChallengeRequest based on Zodios body schema
export type GenerateDynamicChallengeRequest = z.infer<typeof schemas.generateDynamicChallenge_Body>;

// Define FocusArea schema locally if needed for mocks (if not imported from elsewhere)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FocusAreaSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FocusArea = z.infer<typeof FocusAreaSchema>; // Keep for potential internal use in mocks

// Define Trait schema locally for mock data generation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TraitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  score: z.number().gte(0).lte(100).optional(),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Trait = z.infer<typeof TraitSchema>; // Keep for potential internal use in mocks

/**
 * Hook to generate a dynamic challenge based on user context
 * 
 * @returns Mutation for generating a personalized challenge
 */
export const useGenerateDynamicChallenge = () => {
  return useMutation<ApiResponse<ApiChallenge>, Error, GenerateDynamicChallengeRequest>({
    mutationFn: async (request): Promise<ApiResponse<ApiChallenge>> => {
      // When Zodios client is enabled:
      // return apiClient.post<ApiChallenge, GenerateDynamicChallengeRequest>(
      //   '/adaptive/dynamic-challenge',
      //   request,
      //   { alias: 'generateDynamicChallenge' }
      // );
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      console.log('Mock: Generating dynamic challenge with request:', request);
      
      // --- Mock Implementation ---
      // Simple mock logic, a real backend would do complex generation
      const challengeContent = {
        title: request.focusArea 
          ? `Dynamic ${request.focusArea} Challenge` 
          : 'Personalized Dynamic Challenge',
        description: `This dynamic challenge focuses on ${request.focusArea || 'your profile'}, considering concepts like ${request.includeConcepts?.join(', ') || 'general skills'}. Your preferred difficulty is ${request.preferredDifficulty}.`,
        difficulty: request.preferredDifficulty || 'intermediate',
        category: request.focusArea || 'Adaptive Learning',
        estimatedTime: '20 min',
        matchScore: Math.floor(Math.random() * 30) + 70, // Random high match score
        tags: [
          'dynamic', 
          'personalized',
          ...(request.focusArea ? [request.focusArea.toLowerCase().replace(/\s+/g, '-')] : []),
          ...(request.includeConcepts ? request.includeConcepts.map(c => c.toLowerCase().replace(/\s+/g, '-')) : [])
        ]
      };

      // Adjust mockApiChallenge to match the full ApiChallenge schema
      const mockApiChallenge: ApiChallenge = {
        id: `dyn-challenge-${uuidv4().substring(0, 8)}`,
        title: challengeContent.title,
        description: challengeContent.description,
        difficulty: challengeContent.difficulty,
        category: challengeContent.category ?? 'general',
        createdBy: 'AI Generator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        challengeType: 'Dynamic',
        formatType: 'Interactive',
        isPublic: false,
        tags: challengeContent.tags,
        estimatedTime: challengeContent.estimatedTime,
        focusArea: request.focusArea,
        // Add missing required fields from the Zodios Challenge schema
        content: JSON.stringify(challengeContent), // Assuming content holds the details
        userEmail: 'mock-user@example.com', // Need a user email or ID based on schema
        status: 'pending' // Default status
      };
      
      return {
        success: true,
        status: 201,
        data: schemas.Challenge.parse(mockApiChallenge) // Validate mock response
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
  return useQuery({
    queryKey: adaptiveKeys.recommendations(userId, limit),
    queryFn: async (): Promise<ApiResponse<AdaptiveRecommendation[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const mockRecommendations: AdaptiveRecommendation[] = [
        {
          id: 'rec-1',
          userId,
          type: 'challenge',
          contentId: 'challenge-1',
          relevanceScore: 85,
          reason: 'Based on your interest in problem-solving',
          metadata: {
            difficulty: 'intermediate',
            focusArea: 'problem-solving',
            estimatedTime: 20
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'rec-2',
          userId,
          type: 'resource',
          contentId: 'resource-1',
          relevanceScore: 78,
          reason: 'To improve your critical thinking skills',
          metadata: {
            type: 'article',
            topic: 'critical-thinking',
            estimatedReadTime: 15
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'rec-3',
          userId,
          type: 'skill_focus',
          contentId: '', // Empty string instead of null
          relevanceScore: 90,
          reason: 'To help you level up your AI collaboration skills',
          metadata: {
            skill: 'ai-collaboration',
            currentLevel: 2,
            suggestedAction: 'Practice writing better prompts'
          },
          createdAt: new Date().toISOString()
        }
      ];
      
      return {
        success: true,
        status: 200,
        data: mockRecommendations.slice(0, limit)
      };
    },
    enabled: enabled && !!userId,
    
    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    
    // Prevent unnecessary re-renders with structuralSharing option
    structuralSharing: true,
    
    // Don't refetch on window focus to prevent unexpected updates
    refetchOnWindowFocus: false
  });
}; 