/**
 * Focus Areas Service
 * 
 * Provides React Query hooks for focus area-related API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';
import { schemas } from '@/lib/api/generated-zodios-client';

// --- Define types based on Zodios schemas ---

// Import FocusArea from Zodios schema
export type FocusArea = z.infer<typeof schemas.FocusArea>;

// Define schema for traits used in requests
const TraitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  score: z.number().gte(0).lte(100).optional(),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Trait = z.infer<typeof TraitSchema>;

// Define schema for attitudes used in requests
const AttitudeSchema = z.object({
  id: z.string(),
  attitude: z.string(),
  strength: z.number().gte(0).lte(100)
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Attitude = z.infer<typeof AttitudeSchema>;

// Define schema for professional context
const ProfessionalContextSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional()
});

// Define schema for focus area recommendation request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RecommendFocusAreasRequestSchema = z.object({
  traits: z.array(TraitSchema),
  attitudes: z.array(AttitudeSchema).optional(),
  professionalContext: ProfessionalContextSchema.optional()
});
export type RecommendFocusAreasRequest = z.infer<typeof RecommendFocusAreasRequestSchema>;

// Define schema for personality context
const PersonalityContextSchema = z.object({
  traits: z.array(TraitSchema),
  attitudes: z.array(AttitudeSchema).optional()
});

// Define schema for focus area selection request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SaveFocusAreaRequestSchema = z.object({
  userEmail: z.string().email().optional(),
  focusAreaId: z.string().uuid(),
  personalityContext: PersonalityContextSchema.optional(),
  professionalContext: ProfessionalContextSchema.optional()
});
export type SaveFocusAreaRequest = z.infer<typeof SaveFocusAreaRequestSchema>;

// Focus keys for React Query
const focusKeys = {
  all: ['focus'] as const,
  lists: () => [...focusKeys.all, 'list'] as const,
  list: (filters: string) => [...focusKeys.lists(), { filters }] as const,
  details: () => [...focusKeys.all, 'detail'] as const,
  detail: (id: string) => [...focusKeys.details(), id] as const,
};

// Mock focus areas for development
const mockFocusAreas: FocusArea[] = [
  {
    id: 'focus-1',
    name: 'Strategic Thinking',
    description: 'Ability to plan and execute long-term strategies',
    matchLevel: 85,
  },
  {
    id: 'focus-2',
    name: 'Creative Problem Solving',
    description: 'Finding innovative solutions to complex challenges',
    matchLevel: 75,
  },
  {
    id: 'focus-3',
    name: 'Emotional Intelligence',
    description: 'Understanding and managing emotions effectively',
    matchLevel: 90,
  },
];

/**
 * Hook to get all focus areas
 */
export const useGetFocusAreas = () => {
  return useQuery({
    queryKey: focusKeys.lists(),
    queryFn: async (): Promise<ApiResponse<FocusArea[]>> => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        status: 200,
        data: mockFocusAreas,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to get a specific focus area by ID
 */
export const useGetFocusArea = (id: string) => {
  return useQuery({
    queryKey: focusKeys.detail(id),
    queryFn: async (): Promise<ApiResponse<FocusArea>> => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const focusArea = mockFocusAreas.find(f => f.id === id);
      if (!focusArea) {
        throw new Error('Focus area not found');
      }
      
      return {
        success: true,
        status: 200,
        data: focusArea,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
};

/**
 * Hook to update a focus area
 */
export const useUpdateFocusArea = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FocusArea> }): Promise<ApiResponse<FocusArea>> => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const focusArea = mockFocusAreas.find(f => f.id === id);
      if (!focusArea) {
        throw new Error('Focus area not found');
      }
      
      const updatedFocusArea = {
        ...focusArea,
        ...data,
      };
      
      return {
        success: true,
        status: 200,
        data: updatedFocusArea,
      };
    },
    onSuccess: (response, variables) => {
      // Update cache
      queryClient.setQueryData(focusKeys.detail(variables.id), response);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: focusKeys.lists() });
    },
  });
};

/**
 * Hook to get recommended focus areas based on user's traits and context
 */
export const useRecommendFocusAreas = () => {
  return useMutation<ApiResponse<FocusArea[]>, Error, RecommendFocusAreasRequest>({
    mutationFn: async (data) => {
      // When Zodios client is enabled:
      // return apiClient.post<FocusArea[], RecommendFocusAreasRequest>(
      //   '/focus-areas/recommend',
      //   data
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 900));
      
      // Use traits to personalize which focus areas to recommend (simple mock logic)
      const hasCriticalThinking = data.traits.some(trait => 
        trait.name.toLowerCase().includes('analy') || 
        trait.name.toLowerCase().includes('critical') ||
        (trait.score && trait.score > 75)
      );
      
      const hasCreativity = data.traits.some(trait => 
        trait.name.toLowerCase().includes('creat') ||
        trait.name.toLowerCase().includes('innov') ||
        (trait.score && trait.score > 70)
      );
      
      // Default recommended focus areas
      const mockRecommendedFocusAreas: FocusArea[] = [];
      
      // Add focus areas based on traits
      if (hasCriticalThinking) {
        mockRecommendedFocusAreas.push({
          id: 'focus-1',
          name: 'Critical Thinking',
          description: 'Develop skills to analyze information objectively and make reasoned judgments',
          category: 'cognitive',
          difficulty: 'intermediate'
        });
      }
      
      if (hasCreativity) {
        mockRecommendedFocusAreas.push({
          id: 'focus-2',
          name: 'Creative Problem Solving',
          description: 'Learn techniques to approach problems from different angles and generate innovative solutions',
          category: 'cognitive',
          difficulty: 'intermediate'
        });
      }
      
      // Always include AI Collaboration as a recommendation
      mockRecommendedFocusAreas.push({
        id: 'focus-3',
        name: 'AI Collaboration',
        description: 'Develop skills to effectively collaborate with AI systems',
        category: 'technical',
        difficulty: 'advanced'
      });
      
      // If professional context includes leadership-related roles, include that focus area
      if (data.professionalContext?.title?.toLowerCase().includes('lead') ||
          data.professionalContext?.title?.toLowerCase().includes('manage') ||
          data.professionalContext?.title?.toLowerCase().includes('direct')) {
        mockRecommendedFocusAreas.push({
          id: 'focus-4',
          name: 'Adaptive Leadership',
          description: 'Learn to lead in complex, rapidly changing environments',
          category: 'leadership',
          difficulty: 'expert'
        });
      }
      
      return {
        data: mockRecommendedFocusAreas,
        status: 200,
        success: true,
        error: undefined
      };
    }
  });
};

/**
 * Hook to save user's selected focus area with full user context
 */
export const useSaveFocusAreaSelection = () => {
  return useMutation<ApiResponse<FocusArea>, Error, SaveFocusAreaRequest>({
    mutationFn: async (data) => {
      // When Zodios client is enabled:
      // return apiClient.post<FocusArea, SaveFocusAreaRequest>(
      //   '/focus-areas/select',
      //   data
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // For the mock, just find the focus area by ID from a simulated list of areas
      const mockFocusAreas: FocusArea[] = [
        {
          id: 'focus-1',
          name: 'Critical Thinking',
          description: 'Develop skills to analyze information objectively and make reasoned judgments',
          category: 'cognitive',
          difficulty: 'intermediate'
        },
        {
          id: 'focus-2',
          name: 'Creative Problem Solving',
          description: 'Learn techniques to approach problems from different angles and generate innovative solutions',
          category: 'cognitive',
          difficulty: 'intermediate'
        },
        {
          id: 'focus-3',
          name: 'AI Collaboration',
          description: 'Develop skills to effectively collaborate with AI systems',
          category: 'technical',
          difficulty: 'advanced'
        },
        {
          id: 'focus-4',
          name: 'Adaptive Leadership',
          description: 'Learn to lead in complex, rapidly changing environments',
          category: 'leadership',
          difficulty: 'expert'
        }
      ];
      
      const selectedFocusArea = mockFocusAreas.find(area => area.id === data.focusAreaId);
      
      if (!selectedFocusArea) {
        throw new Error(`Focus area with ID ${data.focusAreaId} not found`);
      }
      
      return {
        data: selectedFocusArea,
        status: 200,
        success: true,
        error: undefined
      };
    }
  });
};
