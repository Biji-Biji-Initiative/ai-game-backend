/**
 * Traits Service
 * 
 * Provides React Query hooks for trait assessment-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';
// Note: Current Zodios schemas don't include trait assessment endpoints
// import { schemas } from '@/lib/api/generated-zodios-client';

// --- Define types based on Zodios patterns ---

// Define a Trait schema similar to the one we would expect from the API
const TraitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  score: z.number().gte(0).lte(100).optional(),
});
export type Trait = z.infer<typeof TraitSchema>;

// Define the trait assessment request schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TraitAssessmentRequestSchema = z.object({
  userEmail: z.string().email().optional(),
  traits: z.array(TraitSchema),
});
export type TraitAssessmentRequest = z.infer<typeof TraitAssessmentRequestSchema>;

// Define the trait assessment response schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TraitAssessmentResponseSchema = z.object({
  id: z.string().uuid(),
  userEmail: z.string().email(),
  traits: z.array(TraitSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type TraitAssessmentResponse = z.infer<typeof TraitAssessmentResponseSchema>;

// --- Mock data creators ---
const createMockTraits = (): Trait[] => [
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

// --- React Query Hooks ---

/**
 * Hook to get all available traits
 */
export const useGetTraits = () => {
  return useQuery<ApiResponse<Trait[]>, Error>({
    queryKey: ['traits'],
    queryFn: async () => {
      // When Zodios client is enabled:
      // return apiClient.get<Trait[]>('/traits');
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockTraits = createMockTraits();
      
      return {
        data: mockTraits,
        status: 200,
        success: true,
        error: undefined
      };
    },
  });
};

/**
 * Hook to save a user's trait assessment
 */
export const useSaveTraitAssessment = () => {
  return useMutation<ApiResponse<TraitAssessmentResponse>, Error, TraitAssessmentRequest>({
    mutationFn: async (data) => {
      // When Zodios client is enabled:
      // return apiClient.post<TraitAssessmentResponse, TraitAssessmentRequest>(
      //   '/traits/assessment', 
      //   data
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const mockResponse: TraitAssessmentResponse = {
        id: `assessment-${Math.floor(Math.random() * 1000)}`,
        userEmail: data.userEmail || 'user@example.com',
        traits: data.traits,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        data: mockResponse,
        status: 201,
        success: true,
        error: undefined
      };
    }
  });
};

/**
 * Hook to get a user's trait assessment
 */
export const useGetTraitAssessment = (userEmail: string) => {
  return useQuery<ApiResponse<TraitAssessmentResponse>, Error>({
    queryKey: ['traitAssessment', userEmail],
    queryFn: async () => {
      // When Zodios client is enabled:
      // return apiClient.get<TraitAssessmentResponse>(`/traits/assessment/${userEmail}`);
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate mock data
      const mockTraits = createMockTraits();
      const mockResponse: TraitAssessmentResponse = {
        id: `assessment-${Math.floor(Math.random() * 1000)}`,
        userEmail: userEmail,
        traits: mockTraits,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        data: mockResponse,
        status: 200,
        success: true,
        error: undefined
      };
    },
    // Only fetch if userEmail is provided
    enabled: !!userEmail,
  });
};
