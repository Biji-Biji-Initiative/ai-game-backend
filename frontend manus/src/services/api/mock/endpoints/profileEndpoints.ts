/**
 * Profile API Endpoints
 * 
 * Mock implementations of human edge profile related endpoints
 */

import { generateId, timestamp, delay } from '../../utils';
import apiResponse from '../../apiResponse';
import { Trait, FocusArea, Profile } from '@/store/useGameStore';

interface GenerateProfileRequest {
  userEmail?: string;
  sessionId?: string;
  personalityContext?: {
    traits: Trait[];
    attitudes?: { id: string; attitude: string; strength: number }[];
  };
  professionalContext?: {
    title?: string;
    location?: string;
  };
  focus: FocusArea;
  responses: {
    round1?: { userResponse: string; aiResponse?: string; challenge?: string };
    round2?: { userResponse: string; aiResponse?: string; challenge?: string };
    round3?: { userResponse: string; aiResponse?: string; challenge?: string };
  };
}

interface SharedProfileRequest {
  profileId: string;
}

/**
 * Generate a human edge profile based on game data
 * POST /profiles/generate
 */
export const generateProfile = async (data: GenerateProfileRequest): Promise<{
  success: boolean;
  status: number;
  data?: Profile;
  error?: any;
}> => {
  await delay(1500); // Longer delay to simulate complex processing
  
  // Basic validation
  if (!data.personalityContext?.traits || !Array.isArray(data.personalityContext.traits)) {
    return apiResponse.validationError({ traits: 'Valid traits array is required' });
  }
  
  if (!data.focus) {
    return apiResponse.validationError({ focus: 'Focus area is required' });
  }
  
  // Get top traits (value > 70)
  const topTraits = [...data.personalityContext.traits].filter(trait => trait.value > 70);
  
  // If no strong traits, just take the top 3
  if (topTraits.length < 3) {
    topTraits.push(...[...data.personalityContext.traits]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3 - topTraits.length)
    );
  }
  
  // Generate strengths based on traits and focus area
  const strengths = [
    `Strong ${topTraits[0]?.name || 'analytical'} abilities that provide an edge in ${data.focus.name}`,
    `Capacity to leverage ${topTraits[1]?.name || 'creative'} approaches that complement AI systems`,
    `Advanced ${topTraits[2]?.name || 'contextual'} judgment that enhances decision quality`
  ];
  
  // Generate insights based on focus area
  const insightsByFocus: Record<string, string> = {
    'Creative Problem Solving': 'Your human edge lies in connecting disparate ideas and generating novel solutions that AI might miss. While AI excels at optimization within known parameters, your creativity allows you to reframe problems and explore unconventional approaches that lead to breakthrough innovations.',
    'Ethical Decision Making': 'Your capacity for ethical reasoning gives you a significant edge in navigating complex value judgments that AI systems struggle with. You can integrate moral principles, cultural contexts, and human impacts in ways that algorithmic approaches cannot fully replicate.',
    'Human Connection': 'Your edge over AI is most pronounced in your ability to form authentic connections with others through emotional intelligence and interpersonal nuance. While AI can simulate empathy, your genuine understanding of human emotions and social dynamics creates trust that algorithms cannot match.',
    'Strategic Vision': 'Your advantage lies in integrating broad contextual understanding with purposeful direction-setting. Unlike AI that excels within defined parameters, you can envision holistic futures that balance technical possibilities with human values and organizational purpose.',
    'Adaptability & Resilience': 'Your flexibility in responding to ambiguous and changing circumstances provides a distinct advantage over AI systems. You can navigate uncertainty, recover from setbacks, and adjust your approach based on subtle environmental cues that may not be captured in AI training data.',
    'Cultural Intelligence': 'Your edge stems from deep cultural understanding and sensitivity that allows you to navigate diverse contexts with authenticity. While AI can process cultural patterns, your intuitive grasp of cultural nuances and ability to adapt your communication and behavior appropriately creates connections that AI cannot replicate.'
  };
  
  // Default insight if focus area isn't in our predefined list
  const defaultInsight = 'Your human edge involves integrating contextual understanding with creative approaches and ethical considerations in ways that complement AI capabilities. By focusing on these distinctly human strengths, you can work alongside AI systems while providing unique value through your judgment, intuition, and interpersonal capabilities.';
  
  // Get insight based on focus area or use default
  const insight = insightsByFocus[data.focus.name] || defaultInsight;
  
  // Generate recommendations
  const recommendations = [
    `Develop your ${topTraits[0]?.name || 'analytical'} skills further through structured practice`,
    `Seek opportunities to apply your ${data.focus.name} in collaborative AI-human teams`,
    `Build awareness of AI capabilities to better identify where your human edge adds most value`
  ];
  
  // Create the profile
  const profile: Profile = {
    id: generateId(),
    traits: topTraits,
    focus: data.focus,
    strengths,
    insights: insight,
    recommendations,
    createdAt: timestamp()
  };
  
  return apiResponse.success(profile);
};

/**
 * Get a shared profile by ID
 * GET /profiles/{profileId}
 */
export const getSharedProfile = async (profileId: string): Promise<{
  success: boolean;
  status: number;
  data?: Profile;
  error?: any;
}> => {
  await delay();
  
  // Basic validation
  if (!profileId) {
    return apiResponse.validationError({ profileId: 'Profile ID is required' });
  }
  
  // In a real API, we would fetch from a database
  // Here we generate a mock profile with the requested ID
  
  // Create some mock traits
  const mockTraits: Trait[] = [
    {
      id: 'trait-1',
      name: 'Emotional Intelligence',
      description: 'Ability to recognize and manage emotions, and empathize with others',
      value: 85
    },
    {
      id: 'trait-4',
      name: 'Adaptability',
      description: 'Ability to adjust to new conditions and handle uncertainty',
      value: 78
    },
    {
      id: 'trait-6',
      name: 'Social Intelligence',
      description: 'Ability to navigate complex social relationships and environments',
      value: 92
    }
  ];
  
  // Create a mock focus area
  const mockFocus: FocusArea = {
    id: 'focus-3',
    name: 'Human Connection',
    description: 'Building authentic relationships and meaningful interactions based on empathy and understanding',
    matchLevel: 92
  };
  
  // Create the mock profile
  const profile: Profile = {
    id: profileId,
    traits: mockTraits,
    focus: mockFocus,
    strengths: [
      'Strong Emotional Intelligence abilities that provide an edge in human-centered design',
      'Capacity to leverage Adaptability approaches that complement AI systems',
      'Advanced Social Intelligence judgment that enhances collaboration quality'
    ],
    insights: 'This individual\'s human edge lies in forming authentic connections through emotional and social intelligence. Their ability to understand nuanced human dynamics and adapt to changing social contexts provides significant value in situations requiring trust-building, conflict resolution, and stakeholder alignment.',
    recommendations: [
      'Develop leadership skills that leverage emotional intelligence in team settings',
      'Seek opportunities to facilitate complex multi-stakeholder collaborations',
      'Build awareness of AI emotion detection tools to identify complementary approaches'
    ],
    createdAt: '2025-02-15T08:30:00.000Z'
  };
  
  return apiResponse.success(profile);
};

// Export all endpoints
const profileEndpoints = {
  generateProfile,
  getSharedProfile
};

export default profileEndpoints;
