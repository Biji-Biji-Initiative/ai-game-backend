/**
 * Challenge Service
 * 
 * Provides React Query hooks for game round challenge-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Trait } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

/**
 * Types for challenge-related requests and responses
 */
interface GenerateChallengeRequest {
  userEmail?: string;
  focusAreaId?: string;
  focusArea?: string;
  personalityContext?: {
    traits?: Trait[];
    attitudes?: { id: string; attitude: string; strength: number }[];
  };
  professionalContext?: {
    title?: string;
    location?: string;
  };
  round?: number;
  challengeType?: string;
  formatType?: string;
  difficulty?: string;
}

interface UserResponseSubmission {
  userEmail?: string;
  challengeId: string;
  response: string;
  round: number;
}

/**
 * Challenge interface
 */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  estimatedTime: string;
  matchScore?: number;
  tags: string[];
}

/**
 * Hook to generate a new challenge for a specific round
 */
export const useGenerateChallenge = () => {
  return useMutation<ApiResponse<Challenge>, Error, GenerateChallengeRequest>({
    mutationFn: (data) => 
      apiClient.post<Challenge, GenerateChallengeRequest>(
        '/challenges/generate',
        data
      ),
  });
};

/**
 * Response submission result interface
 */
export interface ResponseSubmissionResult {
  id: string;
  status: string;
  message: string;
}

/**
 * Hook to submit user's response to a challenge
 */
export const useSubmitResponse = () => {
  return useMutation<ApiResponse<ResponseSubmissionResult>, Error, UserResponseSubmission>({
    mutationFn: (data) => 
      apiClient.post<ResponseSubmissionResult, UserResponseSubmission>(
        `/challenges/${data.challengeId}/responses`,
        data
      ),
  });
};

/**
 * AI Response interface
 */
export interface AIResponse {
  response: string;
  analysis?: string;
  insights?: string[];
}

/**
 * Hook to get AI response to user's submission
 */
export const useGetAIResponse = (challengeId: string, round: number, enabled = false) => {
  return useQuery<ApiResponse<AIResponse>, Error>({
    queryKey: ['aiResponse', challengeId, round],
    queryFn: () => apiClient.get<AIResponse>(
      `/challenges/${challengeId}/ai-response`,
      { challengeId: challengeId.toString(), round: round.toString() }
    ),
    enabled: enabled && !!challengeId,
    // Disable automatic refetching
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to get the list of available challenges
 */
export const useGetChallenges = () => {
  return useQuery<ApiResponse<Challenge[]>, Error>({
    queryKey: ['challenges'], // Unique key for this query
    queryFn: async (): Promise<ApiResponse<Challenge[]>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data for challenges
      const mockChallenges: Challenge[] = [
        {
          id: 'challenge-1',
          title: 'AI Ethics Brainstorm',
          description: 'Generate potential ethical issues arising from a new AI product.',
          difficulty: 'Easy',
          category: 'Ethics',
          estimatedTime: '15 min',
          matchScore: 85,
          tags: ['ethics', 'brainstorming', 'ai'],
        },
        {
          id: 'challenge-2',
          title: 'Creative AI Collaboration',
          description: 'Collaborate with a simulated AI to write a short story outline.',
          difficulty: 'Medium',
          category: 'Collaboration',
          estimatedTime: '25 min',
          matchScore: 90,
          tags: ['creativity', 'collaboration', 'writing'],
        },
        {
          id: 'challenge-3',
          title: 'Critical Content Analysis',
          description: 'Analyze an AI-generated news article for potential bias or misinformation.',
          difficulty: 'Hard',
          category: 'Analysis',
          estimatedTime: '30 min',
          matchScore: 78,
          tags: ['critical-thinking', 'analysis', 'media'],
        },
        // Add more mock challenges if desired
      ];

      // Simulate a successful API response structure
      // In a real scenario, this would be: return apiClient.get<Challenge[]>('/challenges');
      return {
        data: mockChallenges,
        status: 200,
        success: true,
        error: undefined, // Explicitly set error to undefined for success case
      };
    },
    refetchOnWindowFocus: false, // Optional: disable refetching on window focus
  });
};

/**
 * Hook to get a specific challenge by ID
 * 
 * @param id The challenge ID to get
 * @param enabled Whether the query should execute automatically
 * @returns Query result with challenge data
 */
export const useGetChallengeById = (id: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<Challenge>, Error>({
    queryKey: ['challenge', id],
    queryFn: async (): Promise<ApiResponse<Challenge>> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, we'd call the API endpoint
      // return apiClient.get<Challenge>(`/challenges/${id}`);
      
      // Mock data for challenges - use the same data as in useGetChallenges
      const mockChallenges: Challenge[] = [
        {
          id: 'challenge-1',
          title: 'AI Ethics Brainstorm',
          description: 'Generate potential ethical issues arising from a new AI product.',
          difficulty: 'Easy',
          category: 'Ethics',
          estimatedTime: '15 min',
          matchScore: 85,
          tags: ['ethics', 'brainstorming', 'ai'],
        },
        {
          id: 'challenge-2',
          title: 'Creative AI Collaboration',
          description: 'Collaborate with a simulated AI to write a short story outline.',
          difficulty: 'Medium',
          category: 'Collaboration',
          estimatedTime: '25 min',
          matchScore: 90,
          tags: ['creativity', 'collaboration', 'writing'],
        },
        {
          id: 'challenge-3',
          title: 'Critical Content Analysis',
          description: 'Analyze an AI-generated news article for potential bias or misinformation.',
          difficulty: 'Hard',
          category: 'Analysis',
          estimatedTime: '30 min',
          matchScore: 78,
          tags: ['critical-thinking', 'analysis', 'media'],
        },
        // Add more mock challenges if desired
      ];
      
      // Find the challenge with the matching ID
      const challenge = mockChallenges.find((c: Challenge) => c.id === id);
      
      if (!challenge) {
        return {
          success: false,
          status: 404,
          error: {
            message: 'Challenge not found',
            code: 'NOT_FOUND'
          }
        };
      }
      
      // Return the found challenge
      return {
        success: true,
        status: 200,
        data: challenge
      };
    },
    enabled: enabled && !!id,
  });
};
