/**
 * Personality Service
 *
 * Provides React Query hooks for personality insights related API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
// Remove apiClient import for now as it's unused with mocks
// import apiClient from '../apiClient'; 
import { schemas } from '@/types/api'; // Import Zodios schemas
import { z } from 'zod';

// --- Define local types based on Zodios endpoint definitions ---

type Personality = z.infer<typeof schemas.Personality>;

// Type for the data returned by the 'generateInsights' endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateInsightsResponseDataSchema = z
  .object({
    insights: z
      .object({
        strengths: z.array(z.string()),
        learningStyle: z.string(),
        challengeRecommendations: z.array(z.string()),
        summary: z.string(),
      })
      .partial()
      .passthrough(),
    generatedAt: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
type PersonalityInsights = z.infer<typeof generateInsightsResponseDataSchema>;

type GeneratePersonalityInsightsRequest = z.infer<typeof schemas.generateInsights_Body>;

type TraitInput = z.infer<typeof schemas.updatePersonalityTraits_Body>;
type AttitudeInput = z.infer<typeof schemas.updateAIAttitudes_Body>;

// Type for the data returned by the 'calculateChallengeCompatibility' endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const challengeCompatibilityResponseDataSchema = z
  .object({
    compatibility: z.number().gte(0).lte(100),
    strengths: z.array(z.string()),
    challenges: z.array(z.string()),
    recommendedApproach: z.string(),
  })
  .partial()
  .passthrough();
type ChallengeCompatibility = z.infer<typeof challengeCompatibilityResponseDataSchema>;

/**
 * Types for personality insights
 */
export interface CommunicationStyle {
  primary: string;   // e.g., "Analytical", "Empathetic", "Direct"
  secondary: string; // e.g., "Collaborative", "Visual", "Detailed"
  description: string;
}

export interface WorkStyle {
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

export interface AICollaborationStrategy {
  title: string;     // e.g., "Strategic Delegator"
  description: string;
  tips: string[];
}

// Personality keys for React Query
const personalityKeys = {
  all: ['personality'] as const,
  traits: () => [...personalityKeys.all, 'traits'] as const,
  trait: (id: string) => [...personalityKeys.traits(), id] as const,
  attitudes: () => [...personalityKeys.all, 'attitudes'] as const,
  attitude: (id: string) => [...personalityKeys.attitudes(), id] as const,
  assessment: (userId: string) => [...personalityKeys.all, 'assessment', userId] as const,
  preferences: (userId: string) => [...personalityKeys.all, 'preferences', userId] as const,
};

// Personality schemas
const TraitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  score: z.number().min(0).max(100).optional(),
  importance: z.number().min(1).max(5).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AttitudeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  level: z.number().min(1).max(5),
  impact: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PersonalityAssessmentSchema = z.object({
  userId: z.string(),
  traits: z.array(TraitSchema),
  attitudes: z.array(AttitudeSchema),
  dominantTraits: z.array(z.string()),
  learningStyle: z.string(),
  communicationStyle: z.string(),
  lastUpdated: z.string(),
});

const PersonalityPreferencesSchema = z.object({
  userId: z.string(),
  preferredChallengeTypes: z.array(z.string()),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  focusAreas: z.array(z.string()),
  learningGoals: z.array(z.string()),
  updatedAt: z.string(),
});

type Trait = z.infer<typeof TraitSchema>;
type Attitude = z.infer<typeof AttitudeSchema>;
type PersonalityAssessment = z.infer<typeof PersonalityAssessmentSchema>;
type PersonalityPreferences = z.infer<typeof PersonalityPreferencesSchema>;

/**
 * Hook to generate personality insights based on user's profile
 */
export const useGeneratePersonalityInsights = (userId: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<PersonalityInsights>, Error>({
    queryKey: ['personalityInsights', userId],
    queryFn: async (): Promise<ApiResponse<PersonalityInsights>> => {
      // When Zodios client is enabled in apiClient:
      // return apiClient.post<PersonalityInsights, GeneratePersonalityInsightsRequest>(
      //   `/personality/insights/generate`,
      //   { includeTraits: true, includeAttitudes: true } // Pass request body matching GeneratePersonalityInsightsRequest
      // );

      // --- Mock Implementation --- 
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockData: PersonalityInsights = {
        insights: {
           summary: "Mock summary based on Zodios schema.",
           strengths: ["Mock Strength 1", "Mock Strength 2"],
           learningStyle: "Mock Visual Learner",
           challengeRecommendations: ["Mock Challenge Rec 1"],
        },
        generatedAt: new Date().toISOString(),
      };
      return {
        data: mockData,
        status: 200,
        success: true,
        error: undefined
      };
      // --- End Mock --- 
    },
    enabled: enabled && !!userId,
    refetchOnWindowFocus: false
  });
};

/**
 * Hook to trigger personality insights generation (mutation version)
 */
export const useGeneratePersonalityInsightsMutation = (userId: string) => {
  return useMutation<ApiResponse<PersonalityInsights>, Error, GeneratePersonalityInsightsRequest>({
    mutationFn: async (requestData): Promise<ApiResponse<PersonalityInsights>> => {
      // When Zodios client is enabled:
      // return apiClient.post<PersonalityInsights, GeneratePersonalityInsightsRequest>(
      //  `/personality/insights/generate`,
      //  requestData
      // );

      // --- Mock Implementation --- 
      await new Promise(resolve => setTimeout(resolve, 1200));
      console.log('Generating insights for', userId, 'with data:', requestData);
      const mockData: PersonalityInsights = {
         insights: {
           summary: "Mock generated summary.",
           strengths: ["Mock Generated Strength"],
           learningStyle: "Mock Auditory Learner",
           challengeRecommendations: ["Mock Generated Rec"],
         },
         generatedAt: new Date().toISOString(),
      };
      return {
        data: mockData,
        status: 200,
        success: true,
        error: undefined
      };
       // --- End Mock --- 
    }
  });
};

/**
 * Hook to update personality traits
 */
export const useUpdatePersonalityTraits = (userId: string) => {
  return useMutation<ApiResponse<Personality>, Error, TraitInput>({
    mutationFn: async (traitData): Promise<ApiResponse<Personality>> => {
      // When Zodios client is enabled:
      // return apiClient.put<Personality, TraitInput>(
      //  `/personality/traits`,
      //  traitData
      // );

      // --- Mock Implementation --- 
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Updating traits for', userId, 'with data:', traitData);
      const mockResponse: Personality = {
        id: 'mock-personality-id',
        userId: userId,
        traits: traitData.traits,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add other required fields from the Personality schema if any
      };
       return {
        data: mockResponse,
        status: 200,
        success: true,
        error: undefined
      };
      // --- End Mock --- 
    }
  });
};

/**
 * Hook to update AI attitudes
 */
export const useUpdateAIAttitudes = (userId: string) => {
  return useMutation<ApiResponse<Personality>, Error, AttitudeInput>({
    mutationFn: async (attitudeData): Promise<ApiResponse<Personality>> => {
      // When Zodios client is enabled:
      // return apiClient.put<Personality, AttitudeInput>(
      //  `/personality/attitudes`,
      //  attitudeData
      // );

      // --- Mock Implementation --- 
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Updating attitudes for', userId, 'with data:', attitudeData);
      const mockResponse: Personality = {
        id: 'mock-personality-id',
        userId: userId,
        attitudes: attitudeData.attitudes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add other required fields from the Personality schema if any
      };
       return {
        data: mockResponse,
        status: 200,
        success: true,
        error: undefined
      };
      // --- End Mock --- 
    }
  });
};

/**
 * Hook to get challenge compatibility with user's personality profile
 */
export const useGetChallengeCompatibility = (userId: string, challengeId: string, enabled: boolean = true) => {
  // Note: The endpoint seems to be POST /personality/compatibility, not GET
  // It also doesn't take challengeId in the path, but likely in the body.
  // We'll use useMutation here based on the API definition.
  // If a GET endpoint exists, the key/queryFn would need adjustment.

  // This hook might need to be a mutation based on the API spec found.
  // For now, keeping as query, but mocking the expected structure.
  return useQuery<ApiResponse<ChallengeCompatibility>, Error>({
    queryKey: ['challengeCompatibility', userId, challengeId],
    queryFn: async (): Promise<ApiResponse<ChallengeCompatibility>> => {
      // When Zodios client is enabled (assuming a GET endpoint exists):
      // return apiClient.get<ChallengeCompatibility>(
      //  `/personality/${userId}/compatibility/${challengeId}`
      // );
      
      // If it's a POST:
      // return apiClient.post<ChallengeCompatibility, { challengeId: string }>( // Adjust request body type
      //   `/personality/compatibility`,
      //   { challengeId } 
      // );

       // --- Mock Implementation (based on GET assumption) --- 
      await new Promise(resolve => setTimeout(resolve, 600));
      const score = Math.floor(Math.random() * 71) + 30;
      const mockResponse: ChallengeCompatibility = {
        compatibility: score,
        strengths: ["Mock Strength 1"],
        challenges: ["Mock Challenge 1"],
        recommendedApproach: `Mock approach for score ${score}.`,
      };
      return {
        data: mockResponse,
        status: 200,
        success: true,
        error: undefined
      };
      // --- End Mock --- 
    },
    enabled: enabled && !!userId && !!challengeId,
    refetchOnWindowFocus: false
  });
};

/**
 * Hook to get all personality traits
 */
export const useTraits = (enabled: boolean = true) => {
  return useQuery({
    queryKey: personalityKeys.traits(),
    queryFn: async (): Promise<ApiResponse<Trait[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockTraits: Trait[] = [
        {
          id: 'trait-1',
          name: 'Analytical Thinking',
          description: 'Ability to break down complex problems and analyze them systematically',
          category: 'cognitive',
          score: 85,
          importance: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'trait-2',
          name: 'Creative Problem Solving',
          description: 'Ability to find innovative solutions to challenges',
          category: 'cognitive',
          score: 78,
          importance: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      return {
        success: true,
        status: 200,
        data: mockTraits,
      };
    },
    enabled,
  });
};

/**
 * Hook to get all attitudes
 */
export const useAttitudes = (enabled: boolean = true) => {
  return useQuery({
    queryKey: personalityKeys.attitudes(),
    queryFn: async (): Promise<ApiResponse<Attitude[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockAttitudes: Attitude[] = [
        {
          id: 'attitude-1',
          name: 'Growth Mindset',
          description: 'Belief in the ability to develop abilities through effort',
          category: 'learning',
          level: 4,
          impact: 'High positive impact on learning outcomes',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'attitude-2',
          name: 'Openness to Feedback',
          description: 'Willingness to receive and act on constructive feedback',
          category: 'learning',
          level: 5,
          impact: 'Essential for continuous improvement',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      return {
        success: true,
        status: 200,
        data: mockAttitudes,
      };
    },
    enabled,
  });
};

/**
 * Hook to get personality assessment for a user
 */
export const usePersonalityAssessment = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: personalityKeys.assessment(userId),
    queryFn: async (): Promise<ApiResponse<PersonalityAssessment>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const mockAssessment: PersonalityAssessment = {
        userId,
        traits: [
          {
            id: 'trait-1',
            name: 'Analytical Thinking',
            description: 'Ability to break down complex problems',
            category: 'cognitive',
            score: 85,
            importance: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        attitudes: [
          {
            id: 'attitude-1',
            name: 'Growth Mindset',
            description: 'Belief in ability to grow',
            category: 'learning',
            level: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        dominantTraits: ['Analytical', 'Creative'],
        learningStyle: 'Visual-Practical',
        communicationStyle: 'Direct-Collaborative',
        lastUpdated: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: mockAssessment,
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to get personality preferences for a user
 */
export const usePersonalityPreferences = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: personalityKeys.preferences(userId),
    queryFn: async (): Promise<ApiResponse<PersonalityPreferences>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const mockPreferences: PersonalityPreferences = {
        userId,
        preferredChallengeTypes: ['problem-solving', 'analysis', 'creative'],
        preferredDifficulty: 'intermediate',
        focusAreas: ['AI Ethics', 'Technical Skills', 'Communication'],
        learningGoals: ['Master AI Collaboration', 'Improve Problem Solving'],
        updatedAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: mockPreferences,
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to update personality preferences
 */
export const useUpdatePersonalityPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      preferences 
    }: { 
      userId: string; 
      preferences: Omit<PersonalityPreferences, 'userId' | 'updatedAt'>; 
    }): Promise<ApiResponse<PersonalityPreferences>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const mockPreferences: PersonalityPreferences = {
        userId,
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: mockPreferences,
      };
    },
    onSuccess: (response, variables) => {
      // Update preferences in cache
      queryClient.setQueryData(
        personalityKeys.preferences(variables.userId),
        response
      );
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: personalityKeys.assessment(variables.userId),
      });
    },
  });
}; 