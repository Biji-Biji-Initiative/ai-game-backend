/**
 * Profile Service
 * 
 * Provides React Query hooks for human edge profile-related API operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';
import { schemas } from '@/lib/api/generated-zodios-client';
import { v4 as uuidv4 } from 'uuid';

// --- Define types based on Zodios patterns ---

// Import FocusArea from Zodios schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FocusAreaSchema = schemas.FocusArea;
// FocusArea type is defined but not directly used in this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FocusArea = z.infer<typeof FocusAreaSchema>;

// Define trait schema based on existing patterns in Zodios
const TraitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  score: z.number().gte(0).lte(100).optional(),
});
// Trait type is defined for consistency with other services but not directly used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Trait = z.infer<typeof TraitSchema>;

// Define attitude schema
const AttitudeSchema = z.object({
  id: z.string(),
  attitude: z.string(),
  strength: z.number().gte(0).lte(100)
});
// Attitude type is defined for consistency but not directly used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Attitude = z.infer<typeof AttitudeSchema>;

// Define Profile schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  userEmail: z.string().email().optional(),
  name: z.string().optional(),
  summary: z.string(),
  strengths: z.array(z.string()),
  challenges: z.array(z.string()),
  recommendations: z.array(z.string()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sessionId: z.string().optional(),
  focusArea: z.string(),
  traits: z.array(TraitSchema).optional(),
  attitudes: z.array(AttitudeSchema).optional(),
});
type Profile = z.infer<typeof ProfileSchema>;

// Define ResponseRound schema for user-AI interactions
const ResponseRoundSchema = z.object({
  userResponse: z.string(),
  aiResponse: z.string().optional(),
  challenge: z.string().optional()
});

// Define the GenerateProfileRequest schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GenerateProfileRequestSchema = z.object({
  userEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
  personalityContext: z.object({
    traits: z.array(TraitSchema),
    attitudes: z.array(AttitudeSchema).optional()
  }).optional(),
  professionalContext: z.object({
    title: z.string().optional(),
    location: z.string().optional()
  }).optional(),
  focus: z.string(), // Using string instead of FocusArea for flexibility
  responses: z.object({
    round1: ResponseRoundSchema.optional(),
    round2: ResponseRoundSchema.optional(),
    round3: ResponseRoundSchema.optional()
  })
});
 
type GenerateProfileRequest = z.infer<typeof GenerateProfileRequestSchema>;

/**
 * Hook to generate a human edge profile based on game data
 */
export const useGenerateProfile = () => {
  return useMutation<ApiResponse<Profile>, Error, GenerateProfileRequest>({
    mutationFn: async (data): Promise<ApiResponse<Profile>> => {
      // When Zodios client is enabled:
      // return apiClient.post<Profile, GenerateProfileRequest>(
      //   '/profiles/generate',
      //   data
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const mockProfile: Profile = {
        id: uuidv4(),
        userId: 'user-123',
        userEmail: data.userEmail || 'user@example.com',
        name: 'Human Edge Profile',
        summary: 'This user shows strong analytical abilities and an interest in creative problem-solving.',
        strengths: [
          'Critical thinking',
          'Pattern recognition',
          'Information synthesis'
        ],
        challenges: [
          'May overlook emotional aspects of problems',
          'Could benefit from more collaborative approaches'
        ],
        recommendations: [
          'Focus on developing empathetic communication',
          'Explore more diverse perspectives',
          'Continue leveraging analytical strengths'
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionId: data.sessionId,
        focusArea: data.focus,
        traits: data.personalityContext?.traits,
        attitudes: data.personalityContext?.attitudes
      };
      
      return {
        data: mockProfile,
        status: 201,
        success: true,
        error: undefined
      };
    }
  });
};

/**
 * Hook to fetch a shared profile by ID
 */
export const useGetSharedProfile = (profileId: string) => {
  return useQuery<ApiResponse<Profile>, Error>({
    queryKey: ['profile', profileId],
    queryFn: async (): Promise<ApiResponse<Profile>> => {
      // When Zodios client is enabled:
      // return apiClient.get<Profile>(`/profiles/${profileId}`);
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      const mockProfile: Profile = {
        id: profileId,
        userId: 'user-123',
        name: 'Human Edge Profile',
        summary: 'This shared profile highlights the user\'s unique strengths and areas for growth.',
        strengths: [
          'Collaborative approach',
          'Clear communication',
          'Strategic thinking'
        ],
        challenges: [
          'May need to improve technical depth',
          'Could benefit from more structured planning'
        ],
        recommendations: [
          'Continue developing technical skills',
          'Practice more structured planning approaches',
          'Leverage existing communication strengths'
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        focusArea: 'critical-thinking',
        traits: [
          { id: 'trait-1', name: 'Analytical Thinking', score: 85 },
          { id: 'trait-2', name: 'Creativity', score: 75 },
          { id: 'trait-3', name: 'Adaptability', score: 80 }
        ]
      };
      
      return {
        data: mockProfile,
        status: 200,
        success: true,
        error: undefined
      };
    },
    // Only fetch if profileId is provided
    enabled: !!profileId,
  });
};
