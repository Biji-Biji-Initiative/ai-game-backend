/**
 * AI Attitudes Service
 * 
 * Provides React Query hooks for AI attitudes-related API operations
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import apiClient from '../apiClient'; // Keep commented for mock usage
import { ApiResponse } from '../apiResponse';
// Import AiAttitude definition from store for now, as it differs from Zodios schema
// import { AiAttitude } from '@/store/useGameStore'; 
import { z } from 'zod';

// --- Define types based on current structure (Array of Objects) ---

// Define AiAttitude schema based on the store/current usage
 
const AiAttitudeSchema = z.object({
  id: z.string(), // Usually an identifier like 'optimism', 'skepticism'
  attitude: z.string(), // Display name
  strength: z.number().gte(0).lte(100)
});
export type AiAttitude = z.infer<typeof AiAttitudeSchema>;

// Define schema for saving a single attitude (request might differ from API)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SaveAiAttitudeRequestSchema = z.object({
  userId: z.string().uuid(),
  attitude: AiAttitudeSchema,
});
export type SaveAiAttitudeRequest = z.infer<typeof SaveAiAttitudeRequestSchema>;

// Define schema for saving multiple attitudes (request likely needs mapping for API)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SaveAiAttitudesRequestSchema = z.object({
  userId: z.string().uuid(),
  attitudes: z.array(AiAttitudeSchema),
});
export type SaveAiAttitudesRequest = z.infer<typeof SaveAiAttitudesRequestSchema>;

// Define schema for the Zodios API body (Record<string, number>)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZodiosUpdateAttitudesBodySchema = z.record(z.string(), z.number().gte(0).lte(100));

// Helper function to map array to record for API call
const mapAttitudesToRecord = (attitudes: AiAttitude[]): z.infer<typeof ZodiosUpdateAttitudesBodySchema> => {
  return attitudes.reduce((acc, curr) => {
    acc[curr.id] = curr.strength; // Use id as the key
    return acc;
  }, {} as Record<string, number>);
};

// Query keys for caching
export const aiAttitudesKeys = {
  all: ['ai-attitudes'] as const,
  list: () => [...aiAttitudesKeys.all, 'list'] as const,
  user: (userId: string) => [...aiAttitudesKeys.all, 'user', userId] as const,
};

/**
 * Hook to save a user's AI attitude
 * Note: This assumes an API endpoint for a single attitude, which might not exist.
 * The main endpoint seems to be for updating all attitudes.
 */
export const useSaveAiAttitude = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<AiAttitude>, Error, SaveAiAttitudeRequest>({
    mutationFn: async ({ userId, attitude }) => {
      console.log(`Mock: Saving attitude for user ${userId}:`, attitude);
      
      // When Zodios client is enabled (this specific endpoint might not exist):
      // This would likely involve fetching current attitudes, merging, and calling updateAIAttitudes
      // const currentAttitudesResponse = await apiClient.get... (fetch current record)
      // const currentAttitudes = currentAttitudesResponse.data || {};
      // const updatedRecord = { ...currentAttitudes, [attitude.id]: attitude.strength };
      // return apiClient.put<any, typeof ZodiosUpdateAttitudesBodySchema>(
      //  `/personality/attitudes`, // Path from Zodios
      //  updatedRecord,
      //  { alias: 'updateAIAttitudes' }
      // ).then(response => ({ ...response, data: attitude })); // Return the single attitude for consistency

      // Mock implementation (just returns the input attitude)
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        status: 200,
        data: AiAttitudeSchema.parse(attitude), // Validate mock response
        error: undefined
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate the user's attitude list
      queryClient.invalidateQueries({ queryKey: aiAttitudesKeys.user(variables.userId) });
    },
  });
};

/**
 * Hook to save multiple AI attitudes at once
 */
export const useSaveAiAttitudes = () => {
  const queryClient = useQueryClient();
  
  // The response type from the Zodios `updateAIAttitudes` endpoint is:
  // { attitudes: Record<string, number>, updatedAt: string }
  // We might need to map this back to AiAttitude[] if the UI expects it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ApiUpdateResponseData = { attitudes: Record<string, number>, updatedAt: string };

  return useMutation<ApiResponse<AiAttitude[]>, Error, SaveAiAttitudesRequest>({
    mutationFn: async ({ userId, attitudes }) => {
      console.log(`Mock: Saving ${attitudes.length} attitudes for user ${userId}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const attitudesRecord = mapAttitudesToRecord(attitudes);
      
      // When Zodios client is enabled:
      // return apiClient.put<ApiUpdateResponseData, typeof ZodiosUpdateAttitudesBodySchema>(
      //   `/personality/attitudes`, // Path from Zodios schema
      //   attitudesRecord,
      //   { alias: 'updateAIAttitudes' }
      // ).then(response => {
      //   // Map the response record back to AiAttitude[] if needed by UI
      //   // This assumes we have a way to get the full attitude details (name, description)
      //   // For now, just return the input array for mock consistency
      //   return { ...response, data: attitudes }; 
      // });
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        status: 200,
        data: z.array(AiAttitudeSchema).parse(attitudes), // Validate mock response
        error: undefined
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate the user's attitude list
      queryClient.invalidateQueries({ queryKey: aiAttitudesKeys.user(variables.userId) });
    },
  });
};

/**
 * Hook to get a user's AI attitudes
 * Note: The Zodios API doesn't seem to have a direct GET for attitudes.
 * It might be part of the getPersonalityProfile endpoint.
 */
export const useGetAiAttitudes = (userId: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<AiAttitude[]>, Error>({
    queryKey: aiAttitudesKeys.user(userId),
    queryFn: async (): Promise<ApiResponse<AiAttitude[]>> => {
      console.log(`Mock: Fetching attitudes for user ${userId}`);
      
      // When Zodios client is enabled:
      // This might involve calling getPersonalityProfile and extracting attitudes
      // return apiClient.get<any>(
      //  `/personality/profile`,
      //  { params: { includeAttitudes: true, includeTraits: false, includeInsights: false }, 
      //    alias: 'getPersonalityProfile' }
      // ).then(response => {
      //   const personalityData = response.data.data; // Adjust based on actual response structure
      //   const attitudesRecord = personalityData?.attitudes || {};
      //   // Map record back to AiAttitude[] - needs full details potentially from another source
      //   const attitudesArray = Object.entries(attitudesRecord).map(([id, strength]) => ({ 
      //      id, 
      //      attitude: id.charAt(0).toUpperCase() + id.slice(1), // Mock name 
      //      strength 
      //   }));
      //   return { ...response, data: attitudesArray };
      // });

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      const mockAttitudes: AiAttitude[] = [
        { id: 'optimism', attitude: 'Optimism', strength: 75 },
        { id: 'skepticism', attitude: 'Skepticism', strength: 40 },
        { id: 'collaboration', attitude: 'Collaboration', strength: 85 },
        { id: 'autonomy', attitude: 'Autonomy', strength: 60 }
      ];
      return {
        success: true,
        status: 200,
        data: z.array(AiAttitudeSchema).parse(mockAttitudes), // Validate mock data
        error: undefined
      };
    },
    enabled: enabled && !!userId, // Only run if userId is provided
  });
};
