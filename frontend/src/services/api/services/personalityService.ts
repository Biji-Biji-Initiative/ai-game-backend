/**
 * Personality Service
 *
 * Provides React Query hooks for personality insights related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { Trait, AiAttitude } from '@/store/useGameStore';

/**
 * Types for personality insights
 */
export interface CommunicationStyle {
  primary: string;   // e.g., "Analytical", "Empathetic", "Direct"
  secondary: string; // e.g., "Collaborative", "Visual", "Detailed"
  description: string;
}

export interface WorkStyle {
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

export interface AICollaborationStrategy {
  title: string;     // e.g., "Strategic Delegator"
  description: string;
  tips: string[];
}

export interface PersonalityInsights {
  communicationStyle: CommunicationStyle;
  workStyle: WorkStyle;
  aiCollaborationStrategy: AICollaborationStrategy; 
  keyTraitInsights: string[]; // Insights specific to top traits
  keyAttitudeInsights: string[]; // Insights specific to AI attitudes
  overallSummary: string;
}

/**
 * Hook to generate personality insights based on traits and attitudes
 */
export const useGeneratePersonalityInsights = (enabled: boolean = true) => {
  return useQuery<ApiResponse<PersonalityInsights>, Error>({
    queryKey: ['personalityInsights'],
    queryFn: async (): Promise<ApiResponse<PersonalityInsights>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data
      const mockPersonalityInsights: PersonalityInsights = {
        communicationStyle: {
          primary: "Analytical",
          secondary: "Empathetic",
          description: "Your communication style balances logical analysis with emotional intelligence. You present ideas systematically while considering the impact on others, making your communication both informative and accessible."
        },
        workStyle: {
          strengths: [
            "Problem decomposition: Breaking complex issues into manageable parts",
            "Multifaceted thinking: Considering multiple perspectives before deciding",
            "Adaptability: Navigating ambiguity and changing requirements effectively"
          ],
          challenges: [
            "May spend too much time analyzing before taking action",
            "Can struggle prioritizing among multiple valid approaches"
          ],
          recommendations: [
            "Set time limits for analysis phases to prevent overthinking",
            "Leverage AI tools for routine analysis, focusing your efforts on nuanced judgment",
            "Partner with action-oriented colleagues on time-sensitive projects"
          ]
        },
        aiCollaborationStrategy: {
          title: "Thoughtful Enhancer",
          description: "You excel at elevating AI outputs through critical evaluation and contextual refinement, adding the human touch that transforms basic AI content into something more nuanced and impactful.",
          tips: [
            "Frame precise questions rather than broad prompts when working with AI",
            "Establish clear evaluation criteria before reviewing AI-generated content",
            "Focus on adding context and real-world implications to AI analysis"
          ]
        },
        keyTraitInsights: [
          "Your high critical thinking enables you to evaluate AI outputs effectively, distinguishing genuine insights from plausible-sounding errors",
          "Your creativity complements AI's pattern recognition, letting you generate novel solutions where AI typically suggests variations on known approaches",
          "Your ethical reasoning adds a valuable layer to AI decision-making, considering impacts that automated systems might overlook"
        ],
        keyAttitudeInsights: [
          "Your balanced approach to AI adoption helps you leverage its strengths while remaining aware of limitations",
          "Your comfort with technological change positions you well to adapt as AI capabilities evolve",
          "Your healthy skepticism prompts you to verify AI outputs rather than accepting them uncritically"
        ],
        overallSummary: "Your personality profile reveals someone well-positioned to thrive in the age of AI. You possess the critical evaluation skills to use AI effectively while maintaining autonomy in your thinking. Your combination of analytical abilities and human-centered perspectives allows you to enhance AI outputs with contextual understanding and creative thinking that remains uniquely human."
      };
      
      // Simulate successful response
      return {
        data: mockPersonalityInsights,
        status: 200,
        success: true,
        error: undefined
      };
      
      // Original call would be: return apiClient.get<PersonalityInsights>('/personality/insights');
    },
    enabled,
    refetchOnWindowFocus: false
  });
};

/**
 * Interface for generating personality insights request
 */
export interface GeneratePersonalityInsightsRequest {
  traits: Trait[];
  attitudes: AiAttitude[];
  professionalContext?: {
    title?: string;
    industry?: string;
  };
}

/**
 * Hook to trigger personality insights generation (mutation version)
 */
export const useGeneratePersonalityInsightsMutation = () => {
  return useMutation<ApiResponse<PersonalityInsights>, Error, GeneratePersonalityInsightsRequest>({
    mutationFn: async (requestData): Promise<ApiResponse<PersonalityInsights>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // In a real implementation, we would use requestData to generate personalized insights
      console.log('Generating insights based on:', requestData);
      
      // Mock data - same as above, but in a real implementation would use the input data
      const mockPersonalityInsights: PersonalityInsights = {
        communicationStyle: {
          primary: "Analytical",
          secondary: "Empathetic",
          description: "Your communication style balances logical analysis with emotional intelligence. You present ideas systematically while considering the impact on others, making your communication both informative and accessible."
        },
        workStyle: {
          strengths: [
            "Problem decomposition: Breaking complex issues into manageable parts",
            "Multifaceted thinking: Considering multiple perspectives before deciding",
            "Adaptability: Navigating ambiguity and changing requirements effectively"
          ],
          challenges: [
            "May spend too much time analyzing before taking action",
            "Can struggle prioritizing among multiple valid approaches"
          ],
          recommendations: [
            "Set time limits for analysis phases to prevent overthinking",
            "Leverage AI tools for routine analysis, focusing your efforts on nuanced judgment",
            "Partner with action-oriented colleagues on time-sensitive projects"
          ]
        },
        aiCollaborationStrategy: {
          title: "Thoughtful Enhancer",
          description: "You excel at elevating AI outputs through critical evaluation and contextual refinement, adding the human touch that transforms basic AI content into something more nuanced and impactful.",
          tips: [
            "Frame precise questions rather than broad prompts when working with AI",
            "Establish clear evaluation criteria before reviewing AI-generated content",
            "Focus on adding context and real-world implications to AI analysis"
          ]
        },
        keyTraitInsights: [
          "Your high critical thinking enables you to evaluate AI outputs effectively, distinguishing genuine insights from plausible-sounding errors",
          "Your creativity complements AI's pattern recognition, letting you generate novel solutions where AI typically suggests variations on known approaches",
          "Your ethical reasoning adds a valuable layer to AI decision-making, considering impacts that automated systems might overlook"
        ],
        keyAttitudeInsights: [
          "Your balanced approach to AI adoption helps you leverage its strengths while remaining aware of limitations",
          "Your comfort with technological change positions you well to adapt as AI capabilities evolve",
          "Your healthy skepticism prompts you to verify AI outputs rather than accepting them uncritically"
        ],
        overallSummary: "Your personality profile reveals someone well-positioned to thrive in the age of AI. You possess the critical evaluation skills to use AI effectively while maintaining autonomy in your thinking. Your combination of analytical abilities and human-centered perspectives allows you to enhance AI outputs with contextual understanding and creative thinking that remains uniquely human."
      };
      
      // Simulate successful response
      return {
        data: mockPersonalityInsights,
        status: 200,
        success: true,
        error: undefined
      };
      
      // Original call would be: return apiClient.post<PersonalityInsights, GeneratePersonalityInsightsRequest>('/personality/insights/generate', data);
    }
  });
};

/**
 * Challenge compatibility interface
 */
export interface ChallengeCompatibility {
  score: number;            // 0-100 compatibility score
  matchLevel: 'low' | 'medium' | 'high'; // Qualitative match level
  primaryTraitMatch: string; // Which trait is most compatible
  stretchTraits: string[];   // Traits that will be challenged/developed
  recommendation: string;    // Text explaining the compatibility
}

/**
 * Hook to get challenge compatibility with user's personality profile
 */
export const useGetChallengeCompatibility = (challengeId: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<ChallengeCompatibility>, Error>({
    queryKey: ['challengeCompatibility', challengeId],
    queryFn: async (): Promise<ApiResponse<ChallengeCompatibility>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate a random score between 30 and 100
      const score = Math.floor(Math.random() * 71) + 30;
      
      // Determine match level based on score
      const matchLevel = score < 50 ? 'low' : score < 80 ? 'medium' : 'high';
      
      // Mock trait matches
      const traitOptions = ['Analytical Thinking', 'Creativity', 'Contextual Awareness', 'Strategic Planning', 'Emotional Intelligence', 'Adaptability'];
      const primaryTraitMatch = traitOptions[Math.floor(Math.random() * traitOptions.length)];
      
      // Generate 1-2 stretch traits
      const remainingTraits = traitOptions.filter(t => t !== primaryTraitMatch);
      const numStretchTraits = Math.floor(Math.random() * 2) + 1;
      const stretchTraits = remainingTraits
        .sort(() => 0.5 - Math.random())
        .slice(0, numStretchTraits);
      
      // Generate recommendation based on match level
      let recommendation = '';
      if (matchLevel === 'high') {
        recommendation = `This challenge aligns well with your ${primaryTraitMatch} strength. You're likely to excel at this.`;
      } else if (matchLevel === 'medium') {
        recommendation = `This challenge will leverage your ${primaryTraitMatch} while helping you develop ${stretchTraits.join(' and ')}.`;
      } else {
        recommendation = `This challenge will push you to strengthen your ${stretchTraits.join(' and ')} skills, which may be outside your comfort zone.`;
      }
      
      const mockResponse: ChallengeCompatibility = {
        score,
        matchLevel,
        primaryTraitMatch,
        stretchTraits,
        recommendation
      };
      
      return {
        success: true,
        status: 200,
        data: mockResponse,
        error: undefined
      };
    },
    enabled: enabled
  });
}; 