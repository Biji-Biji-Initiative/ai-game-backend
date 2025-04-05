/**
 * Server-side utility for fetching traits data
 * 
 * This module mocks a server-side API response for trait data,
 * which avoids the client needing to make an HTTP request to /assessment/traits
 */

import { Trait } from '@/services/api/services/traitsService';

/**
 * Creates mock trait data with more extensive traits
 * This mimics the functionality in the client-side useGetTraits hook
 */
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
  },
  {
    id: 'trait-4',
    name: 'Emotional Intelligence',
    description: 'The ability to understand and manage your emotions, and recognize emotions in others',
    category: 'social',
    score: 65
  },
  {
    id: 'trait-5',
    name: 'Contextual Thinking',
    description: 'The ability to consider multiple contexts and perspectives simultaneously',
    category: 'cognitive',
    score: 80
  },
  {
    id: 'trait-6',
    name: 'Ethical Reasoning',
    description: 'The ability to make decisions based on moral principles and values',
    category: 'cognitive',
    score: 75
  }
];

/**
 * Fetches traits data on the server
 * In a real implementation, this would fetch from an actual API
 */
export async function getTraits(): Promise<Trait[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return mock traits data
  return createMockTraits();
}

/**
 * This function is used directly in the API route handler
 * to ensure consistency between server and client data
 */
export async function getTraitsForApi() {
  const traits = await getTraits();
  return {
    data: traits,
    status: 200,
    success: true
  };
} 