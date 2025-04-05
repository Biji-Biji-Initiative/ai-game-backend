/**
 * Focus Areas API Endpoints
 * 
 * Mock implementations of focus area related endpoints
 */

import { delay } from '../../utils';
import apiResponse from '../../apiResponse';
import { focusAreas } from '../data';
import { Trait, FocusArea } from '@/store/useGameStore';

/**
 * Get all available focus areas
 * GET /focus-areas
 */
export const getFocusAreas = async (): Promise<{
  success: boolean;
  status: number;
  data: FocusArea[];
}> => {
  await delay();
  
  // Ensure response data is never undefined
  return {
    success: true,
    status: 200,
    data: focusAreas
  };
};

/**
 * Generate recommended focus areas based on traits and user context
 * POST /focus-areas/recommend
 */
export const recommendFocusAreas = async (data: {
  traits: Trait[];
  attitudes?: { id: string; attitude: string; strength: number }[];
  professionalContext?: { title?: string; location?: string };
}): Promise<{
  success: boolean;
  status: number;
  data?: FocusArea[];
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  // Basic validation
  if (!data.traits || !Array.isArray(data.traits)) {
    return apiResponse.validationError({ traits: 'Valid traits array is required' });
  }
  
  // In a real API, we'd use a more sophisticated algorithm
  // Here we simulate recommendation by assigning match levels that take into account
  // the full user context including traits, attitudes, and professional background
  
  // Get traits with values > 60 as "strengths"
  const strengths = data.traits.filter(trait => trait.value > 60);
  
  // Consider attitudes if available
  const techPositiveAttitude = data.attitudes?.find(a => a.id === 'tech_optimism')?.strength || 50;
  const ethicalConcern = data.attitudes?.find(a => a.id === 'ethical_concern')?.strength || 50;
  
  // Consider professional context if available
  const hasTechRole = data.professionalContext?.title?.toLowerCase().includes('tech') || 
                     data.professionalContext?.title?.toLowerCase().includes('developer') || 
                     data.professionalContext?.title?.toLowerCase().includes('engineer');
  const isInTechHub = data.professionalContext?.location?.toLowerCase().includes('valley') || 
                     data.professionalContext?.location?.toLowerCase().includes('francisco') || 
                     data.professionalContext?.location?.toLowerCase().includes('seattle');
  
  // If no clear strengths, return all focus areas with random match levels
  if (strengths.length === 0) {
    const recommendedAreas = focusAreas.map(area => ({
      ...area,
      matchLevel: Math.floor(Math.random() * 70) + 30 // 30-100 range
    }));
    
    // Sort by match level descending
    recommendedAreas.sort((a, b) => b.matchLevel - a.matchLevel);
    
    return apiResponse.success(recommendedAreas);
  }
  
  // With strengths, we assign match levels based on "simulated" trait compatibility
  const traitFocusMap: Record<string, string[]> = {
    'Emotional Intelligence': ['Human Connection', 'Ethical Decision Making'],
    'Creativity': ['Creative Problem Solving', 'Strategic Vision'],
    'Critical Thinking': ['Ethical Decision Making', 'Strategic Vision'],
    'Adaptability': ['Adaptability & Resilience', 'Creative Problem Solving'],
    'Ethical Reasoning': ['Ethical Decision Making', 'Human Connection'],
    'Social Intelligence': ['Human Connection', 'Cultural Intelligence'],
    'Cultural Awareness': ['Cultural Intelligence', 'Human Connection'],
    'Leadership': ['Strategic Vision', 'Human Connection'],
  };
  
  // Calculate match levels
  const recommendedAreas = focusAreas.map(area => {
    // Base match level between 30-50
    let matchLevel = Math.floor(Math.random() * 20) + 30;
    
    // Boost match level for areas that match the user's strengths
    strengths.forEach(trait => {
      const compatibleFocusAreas = traitFocusMap[trait.name] || [];
      if (compatibleFocusAreas.includes(area.name)) {
        // Boost proportional to the trait value and random factor
        const boost = (trait.value / 100) * (Math.floor(Math.random() * 20) + 20);
        matchLevel += boost;
      }
    });
    
    // Apply attitude-based adjustments if provided
    if (data.attitudes?.length) {
      // Tech optimism boosts tech-focused areas
      if (techPositiveAttitude > 60 && ['Strategic Vision', 'Creative Problem Solving'].includes(area.name)) {
        matchLevel += (techPositiveAttitude - 60) / 2;
      }
      
      // Ethical concern boosts ethical decision making
      if (ethicalConcern > 60 && ['Ethical Decision Making', 'Human Connection'].includes(area.name)) {
        matchLevel += (ethicalConcern - 60) / 2;
      }
    }
    
    // Apply professional context adjustments if provided
    if (data.professionalContext) {
      // Tech professionals might have higher affinity for certain areas
      if (hasTechRole && ['Strategic Vision', 'Adaptability & Resilience'].includes(area.name)) {
        matchLevel += 10;
      }
      
      // Location-based adjustments
      if (isInTechHub && ['Strategic Vision', 'Creative Problem Solving'].includes(area.name)) {
        matchLevel += 5;
      }
    }
    
    // Cap at 100
    matchLevel = Math.min(matchLevel, 100);
    
    return {
      ...area,
      matchLevel
    };
  });
  
  // Sort by match level descending
  recommendedAreas.sort((a, b) => b.matchLevel - a.matchLevel);
  
  return apiResponse.success(recommendedAreas);
};

/**
 * Save user's selected focus area
 * POST /focus-areas/select
 */
export const saveFocusAreaSelection = async (data: {
  userEmail?: string;
  focusAreaId: string;
}): Promise<{
  success: boolean;
  status: number;
  data?: FocusArea;
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  // Basic validation
  if (!data.focusAreaId) {
    return apiResponse.validationError({ focusAreaId: 'Focus area ID is required' });
  }
  
  // Find the selected focus area
  const selectedFocusArea = focusAreas.find(area => area.id === data.focusAreaId);
  
  if (!selectedFocusArea) {
    return apiResponse.notFound('Focus area not found');
  }
  
  // In a real API, we would save this to a database
  // Here we just return success with the selected focus area
  
  return apiResponse.success(selectedFocusArea);
};

// Export all endpoints
const focusEndpoints = {
  getFocusAreas,
  recommendFocusAreas,
  saveFocusAreaSelection
};

export default focusEndpoints;
