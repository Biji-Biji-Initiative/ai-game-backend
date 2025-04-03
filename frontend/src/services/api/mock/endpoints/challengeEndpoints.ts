/**
 * Challenge API Endpoints
 * 
 * Mock implementations of challenge-related API endpoints for game rounds
 */

import { generateId, timestamp, delay } from '../../utils';
import apiResponse from '../../apiResponse';
import { focusAreas } from '../data';
import { FocusArea, Trait } from '@/store/useGameStore';

// Type definitions for challenge-related data
interface Challenge {
  id: string;
  content: string;
  userEmail?: string;
  focusAreaId: string;
  focusArea: string;
  challengeType: string;
  formatType: string;
  difficulty: string;
  timeEstimate: number;
  learningObjectives: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GenerateChallengeRequest {
  userEmail?: string;
  focusAreaId?: string;
  focusArea?: string;
  round?: number;
  challengeType?: string;
  formatType?: string;
  difficulty?: string;
  personalityContext?: {
    traits: Trait[];
    attitudes: { id: string; attitude: string; strength: number }[];
  };
  professionalContext?: {
    title?: string;
    location?: string;
  };
}

interface UserResponseSubmission {
  userEmail?: string;
  challengeId: string;
  response: string;
  round: number;
}

interface AIResponse {
  id: string;
  challengeId: string;
  content: string;
  analysis?: string;
  createdAt: string;
}

/**
 * Generate a new challenge for a specific round
 * POST /challenges/generate
 */
export const generateChallenge = async (data: GenerateChallengeRequest): Promise<{
  success: boolean;
  status: number;
  data?: Challenge;
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  // Basic validation
  if (!data.focusAreaId && !data.focusArea) {
    return apiResponse.validationError({ focusArea: 'Focus area information is required' });
  }
  
  // Find a focus area or use the first one
  let focusArea: FocusArea | null = null;
  if (data.focusAreaId) {
    focusArea = focusAreas.find(fa => fa.id === data.focusAreaId) || null;
  } else if (data.focusArea) {
    focusArea = focusAreas.find(fa => fa.name === data.focusArea) || null;
  }
  
  if (!focusArea) {
    return apiResponse.notFound('Focus area not found');
  }
  
  // Extract personality and professional context data
  const traits = data.personalityContext?.traits || [];
  const attitudes = data.personalityContext?.attitudes || [];
  const professionalTitle = data.professionalContext?.title || '';
  const location = data.professionalContext?.location || '';
  
  // Determine challenge content based on round and context
  const round = data.round || 1;
  let content = '';
  let objectives: string[] = [];
  
  // Get most prominent user traits (top 2)
  const topTraits = [...traits].sort((a, b) => b.value - a.value).slice(0, 2);
  const topTraitNames = topTraits.map(t => t.name).join(' and ');
  
  // Get most prominent attitude
  const topAttitude = [...attitudes].sort((a, b) => b.strength - a.strength)[0];
  const attitudeContext = topAttitude ? 
    (topAttitude.strength > 70 ? `strong ${topAttitude.attitude}` : topAttitude.attitude) : '';
  
  // Craft personalized content based on user context
  switch (round) {
    case 1:
      // Use professional title and location if available
      const roleContext = professionalTitle ? 
        `as ${professionalTitle.includes('a ') || professionalTitle.includes('an ') ? professionalTitle : `a ${professionalTitle}`}` : 
        'with your background';
      
      // Add location context if available
      const locationContext = location ? ` in ${location}` : '';
      
      content = `Design an approach to solve a problem in ${focusArea.name} that leverages your unique human capabilities ${roleContext}${locationContext}${topTraitNames ? `, particularly your ${topTraitNames}` : ''}.`;
      
      // Add attitude context if relevant
      if (attitudeContext && attitudeContext.includes('optimism')) {
        content += ` Consider how emerging technologies might augment your approach.`;
      } else if (attitudeContext && (attitudeContext.includes('concern') || attitudeContext.includes('caution'))) {
        content += ` Be mindful of potential ethical implications in your solution.`;
      }
      
      objectives = [
        `Understand key challenges in ${focusArea.name}`,
        `Leverage your ${topTraitNames || 'human capabilities'} in your approach`,
        'Articulate your unique perspective'
      ];
      break;
    case 2:
      content = `Compare and contrast human vs AI approaches to problem-solving in ${focusArea.name}`;
      
      // Add context based on user's attitudes and traits
      if (attitudeContext) {
        content += ` Given your ${attitudeContext}, explore the complementary strengths of both.`;
      }
      
      objectives = [
        'Identify strengths and limitations of AI',
        'Articulate human competitive advantages',
        'Consider complementary approaches'
      ];
      break;
    case 3:
      content = `Develop a comprehensive strategy that combines human and AI capabilities in ${focusArea.name}`;
      objectives = [
        'Integration of human and AI capabilities',
        'Future-focused perspective on evolving roles',
        'Strategic recommendations for professional development'
      ];
      break;
    default:
      content = `Explore complex challenges in ${focusArea.name} that require human judgment`;
      objectives = [
        'Problem analysis and framing',
        'Creative solution development',
        'Ethical and contextual considerations'
      ];
  }
  
  // Create a challenge based on the focus area and round
  const now = timestamp();
  const newChallenge: Challenge = {
    id: generateId(),
    content,
    userEmail: data.userEmail,
    focusAreaId: focusArea.id,
    focusArea: focusArea.name,
    challengeType: data.challengeType || 'analysis',
    formatType: data.formatType || 'text',
    difficulty: data.difficulty || 'intermediate',
    timeEstimate: 10, // minutes
    learningObjectives: objectives,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
  
  return apiResponse.success(newChallenge);
};

/**
 * Submit user response to a challenge
 * POST /challenges/{id}/responses
 */
export const submitResponse = async (data: UserResponseSubmission): Promise<{
  success: boolean;
  status: number;
  data?: { id: string; challengeId: string; submittedAt: string; round: number };
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  // Basic validation
  if (!data.challengeId) {
    return apiResponse.validationError({ challengeId: 'Challenge ID is required' });
  }
  
  if (!data.response) {
    return apiResponse.validationError({ response: 'Response content is required' });
  }
  
  // In a real API, we would save this to a database
  // Here we just return success with basic metadata
  
  return apiResponse.success({
    id: generateId(),
    challengeId: data.challengeId,
    submittedAt: timestamp(),
    round: data.round || 1
  });
};

/**
 * Get AI response to user's submission
 * GET /challenges/{challengeId}/ai-response
 */
export const getAIResponse = async (challengeId: string, round: number): Promise<{
  success: boolean;
  status: number;
  data?: AIResponse;
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay(1000); // Longer delay to simulate AI processing
  
  // Basic validation
  if (!challengeId) {
    return apiResponse.validationError({ challengeId: 'Challenge ID is required' });
  }
  
  // Generate mock AI response based on round
  let content = '';
  let analysis = '';
  
  switch (round) {
    case 1:
      content = 'I would approach this challenge by analyzing the data systematically, identifying patterns, and applying established algorithms to generate a solution. I would iterate through multiple potential approaches, evaluating each based on efficiency and accuracy metrics. My solution would prioritize optimization and logical consistency, with a focus on scalability.';
      break;
    case 2:
      content = 'My approach to this challenge involves breaking down the problem into discrete components and applying specialized algorithms to each. I would utilize existing models and data patterns to inform my solution, optimizing for performance and reliability. My solution would be methodical and based on established principles within my training.';
      analysis = 'The AI response demonstrates strengths in systematic analysis and application of established patterns, but shows limitations in contextual understanding, value judgments, and creative intuition that might be central to human approaches in this domain.';
      break;
    case 3:
      content = 'For this comprehensive challenge, I would implement a multi-layered approach that leverages data processing capabilities, pattern recognition, and optimization techniques. My solution would follow logical frameworks established in my training, with careful consideration of relevant variables and constraints. The approach would prioritize efficiency, consistency, and measurable outcomes.';
      analysis = 'While the AI response demonstrates computational efficiency and systematic reasoning, it may lack the human elements of intuitive judgment, ethical reasoning, and contextual wisdom that could be essential for this domain. This highlights the potential value of collaborative human-AI approaches.';
      break;
    default:
      content = 'I would solve this problem by analyzing the available information, identifying relevant patterns, and applying appropriate algorithms to reach an optimal solution based on defined parameters and constraints.';
  }
  
  const aiResponse: AIResponse = {
    id: generateId(),
    challengeId,
    content,
    analysis: round > 1 ? analysis : undefined,
    createdAt: timestamp()
  };
  
  return apiResponse.success(aiResponse);
};

// Export all endpoints
const challengeEndpoints = {
  generateChallenge,
  submitResponse,
  getAIResponse
};

export default challengeEndpoints;
