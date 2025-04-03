/**
 * Traits API Endpoints
 * 
 * Mock implementations of trait assessment related endpoints
 */

import { generateId, timestamp, delay } from '../../utils';
import apiResponse from '../../apiResponse';
import { traits } from '../data';
import { Trait } from '@/store/useGameStore';

/**
 * Get all available traits
 * GET /traits
 */
export const getTraits = async (): Promise<{
  success: boolean;
  status: number;
  data: Trait[];
}> => {
  await delay();
  
  return apiResponse.success(traits);
};

/**
 * Save user trait assessment
 * POST /traits/assessment
 */
export const saveTraitAssessment = async (data: {
  userEmail?: string;
  traits: Trait[];
}): Promise<{
  success: boolean;
  status: number;
  data?: Trait[];
  error?: any;
}> => {
  await delay();
  
  // Basic validation
  if (!data.traits || !Array.isArray(data.traits)) {
    return apiResponse.validationError({ traits: 'Valid traits array is required' });
  }
  
  // In a real API, we would save this to a database
  // Here we just return success with the submitted traits
  
  return apiResponse.success(data.traits);
};

/**
 * Get trait assessment for a user
 * GET /traits/assessment/{userEmail}
 */
export const getTraitAssessment = async (userEmail: string): Promise<{
  success: boolean;
  status: number;
  data?: Trait[];
  error?: any;
}> => {
  await delay();
  
  // Basic validation
  if (!userEmail) {
    return apiResponse.validationError({ userEmail: 'User email is required' });
  }
  
  // In a real API, we would fetch from a database
  // Here we just return random values for the traits
  
  const assessedTraits = traits.map(trait => ({
    ...trait,
    value: Math.floor(Math.random() * 100)
  }));
  
  return apiResponse.success(assessedTraits);
};

// Export all endpoints
const traitsEndpoints = {
  getTraits,
  saveTraitAssessment,
  getTraitAssessment
};

export default traitsEndpoints;
