import { z } from 'zod';
import { UIChallenge } from '@/types/api'; // Import from centralized types
import { schemas } from '@/lib/api/generated-zodios-client';

// Use the generated schema for the Challenge type
export type ApiChallenge = z.infer<typeof schemas.Challenge>;

/**
 * Maps an API Challenge object to the UI Challenge structure used in the store/components.
 * @param apiChallenge - The challenge object fetched from the API.
 * @returns A UIChallenge object.
 */
export function mapToUIChallenge(apiChallenge: ApiChallenge): UIChallenge {
  // Safely parse content which might be a JSON string or an object
  let content: { title?: string; description?: string; difficulty?: string; category?: string; estimatedTime?: string } = {};
  try {
    if (typeof apiChallenge.content === 'string') {
      content = JSON.parse(apiChallenge.content);
    } else if (typeof apiChallenge.content === 'object' && apiChallenge.content !== null) {
      content = apiChallenge.content;
    }
  } catch (error) {
    console.error("Failed to parse challenge content:", error);
    // Keep content as an empty object if parsing fails
  }

  const focusArea = apiChallenge.focusArea || content?.category || 'general';

  return {
    id: apiChallenge.id,
    title: content?.title || 'Untitled Challenge',
    description: content?.description || 'No description provided.',
    // Use normalizeDifficulty for consistent mapping
    difficulty: normalizeDifficulty(apiChallenge.difficulty || content?.difficulty),
    category: focusArea,
    estimatedTime: content?.estimatedTime || '30 min', // Provide a default
    // Use focusArea or a default tag
    tags: [focusArea].filter((tag): tag is string => typeof tag === 'string' && tag.length > 0),
    // The API challenge content is mapped to content in the UI challenge
    content: typeof apiChallenge.content === 'string' ? apiChallenge.content : JSON.stringify(apiChallenge.content),
    status: apiChallenge.status || 'pending',
    createdAt: apiChallenge.createdAt || new Date().toISOString(),
    userEmail: apiChallenge.userEmail || '',
  };
}

/**
 * Normalizes various difficulty strings into a standard set.
 * @param difficulty - The difficulty string from the API or content.
 * @returns A standardized difficulty level.
 */
export function normalizeDifficulty(
  difficulty?: string | null
): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (!difficulty) {return 'intermediate';} // Default difficulty
  
  const normalized = difficulty.toLowerCase().trim();
  
  if (normalized.includes('begin') || normalized.includes('easy')) {return 'beginner';}
  if (normalized.includes('advanc') || normalized.includes('hard')) {return 'advanced';}
  if (normalized.includes('expert')) {return 'expert';}
  // Default to intermediate for anything else ('medium', etc.)
  return 'intermediate';
}

// Add other mapping functions here as needed (e.g., mapToUIEvaluation, mapToUIUser, etc.)

// Example placeholder for a User mapper
// import { UserProfile as ApiUserProfile } from '@/lib/api/generated-schemas'; // Adjust path
// import { UserProfile as UIUserProfile } from '@/store/useUserPreferencesStore'; // Adjust path
// export type ApiUser = z.infer<typeof ApiUserProfile>;

// export function mapToUIUser(apiUser: ApiUser): UIUserProfile {
//   return {
//     id: apiUser.id,
//     name: apiUser.username || 'Anonymous User',
//     email: apiUser.email || '',
//     // ... map other relevant fields
//   };
// } 