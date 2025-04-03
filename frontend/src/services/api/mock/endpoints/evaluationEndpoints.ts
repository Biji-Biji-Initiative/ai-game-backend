/**
 * Evaluation API Endpoints
 * 
 * Mock implementations of evaluation-related API endpoints
 */

import { timestamp, delay } from '../../utils';
import apiResponse from '../../apiResponse';
import { RoundEvaluation, EvaluationCategory, GetEvaluationRequest } from '@/services/api/services/evaluationService';

// Mock evaluation categories
const evaluationCategories = {
  round1: [
    {
      id: 'creativity',
      name: 'Creativity',
      score: 85,
      feedback: 'High marks for innovative thinking and novel approaches to the problem. Your response demonstrates creative thinking that AI would struggle to replicate.'
    },
    {
      id: 'critical_thinking',
      name: 'Critical Thinking',
      score: 78,
      feedback: "Good analysis of the problem's complexities with thoughtful consideration of constraints and opportunities. Your human perspective adds valuable context."
    },
    {
      id: 'practical_application',
      name: 'Practical Application',
      score: 72,
      feedback: 'Your solution shows real-world understanding and implementation feasibility, drawing on human experience and intuition.'
    },
    {
      id: 'ethical_reasoning',
      name: 'Ethical Reasoning',
      score: 88,
      feedback: 'Excellent consideration of ethical implications and human values. This is an area where your human perspective strongly outperforms AI.'
    }
  ],
  round2: [
    {
      id: 'human_ai_comparison',
      name: 'Human vs AI Perspective',
      score: 84,
      feedback: 'Strong differentiation between human and AI approaches, showing deep understanding of both capabilities and limitations.'
    },
    {
      id: 'complementary_strengths',
      name: 'Complementary Strengths',
      score: 80,
      feedback: 'Good identification of how human and AI abilities can work together synergistically rather than competitively.'
    },
    {
      id: 'nuance_recognition',
      name: 'Nuance Recognition',
      score: 87,
      feedback: 'Excellent grasp of subtle contextual factors that might be missed by algorithmic analysis. Your human intuition shines here.'
    },
    {
      id: 'future_implications',
      name: 'Future Implications',
      score: 75,
      feedback: 'Thoughtful consideration of long-term impacts and evolving relationships between humans and AI systems.'
    }
  ],
  round3: [
    {
      id: 'communication',
      name: 'Communication',
      score: 82,
      feedback: 'Clear and persuasive explanation of complex ideas in ways that connect with human audiences emotionally and intellectually.'
    },
    {
      id: 'strategic_thinking',
      name: 'Strategic Thinking',
      score: 79,
      feedback: 'Good long-term perspective and ability to balance multiple competing priorities in your approach.'
    },
    {
      id: 'adaptability',
      name: 'Adaptability',
      score: 85,
      feedback: 'Strong flexibility in adjusting to changing circumstances and requirements, showing human resilience.'
    },
    {
      id: 'contextual_wisdom',
      name: 'Contextual Wisdom',
      score: 90,
      feedback: 'Exceptional application of human judgment, wisdom, and experience-based intuition to the challenge.'
    }
  ]
};

// Generate evaluation summaries based on categories
const generateEvaluationSummary = (categories: EvaluationCategory[]): string => {
  const roundNumber = 1; // Default to round 1 if not specified
  const averageScore = Math.round(
    categories.reduce((sum, category) => sum + category.score, 0) / categories.length
  );
  
  if (averageScore >= 85) {
    return `Your response to the Round ${roundNumber} challenge demonstrates exceptional human capabilities. You've shown particularly strong performance in ${categories[0].name} and ${categories[categories.length - 1].name}, leveraging uniquely human strengths that complement and exceed AI capabilities in these domains.`;
  } else if (averageScore >= 75) {
    return `Your work on the Round ${roundNumber} challenge shows solid human edge qualities. Your ${categories[0].name} and approach to complex judgment reveal how human perspectives add value beyond what AI systems currently offer.`;
  } else {
    return `In Round ${roundNumber}, you've demonstrated some human edge qualities, particularly in ${categories[0].name}. With further development of your unique human capabilities, you could strengthen your complementary relationship with AI systems.`;
  }
};

// Generate strengths and improvement areas based on categories
const generateStrengthsAndImprovements = (categories: EvaluationCategory[]): { strengths: string[], improvements: string[] } => {
  // Sort categories by score
  const sortedCategories = [...categories].sort((a, b) => b.score - a.score);
  
  // Top 2 categories are strengths
  const strengths = [
    `Strong ${sortedCategories[0].name.toLowerCase()} demonstrates your human edge`,
    `Effective ${sortedCategories[1].name.toLowerCase()} complements AI capabilities`
  ];
  
  // Bottom 2 categories are improvement areas
  const improvements = [
    `Consider developing your ${sortedCategories[sortedCategories.length - 1].name.toLowerCase()} for greater impact`,
    `Strengthening your ${sortedCategories[sortedCategories.length - 2].name.toLowerCase()} would enhance your human edge`
  ];
  
  return { strengths, improvements };
};

// Generate mock evaluations
const mockEvaluations: Record<number, RoundEvaluation> = {
  1: {
    roundNumber: 1,
    overallScore: 82,
    strengths: [],
    areasForImprovement: [],
    categories: evaluationCategories.round1,
    summary: '',
    timestamp: timestamp(7)
  },
  2: {
    roundNumber: 2,
    overallScore: 84,
    strengths: [],
    areasForImprovement: [],
    categories: evaluationCategories.round2,
    summary: '',
    timestamp: timestamp(3)
  },
  3: {
    roundNumber: 3,
    overallScore: 86,
    strengths: [],
    areasForImprovement: [],
    categories: evaluationCategories.round3,
    summary: '',
    timestamp: timestamp(1)
  }
};

// Initialize the mock evaluations with summaries, strengths, and improvements
Object.keys(mockEvaluations).forEach(roundKey => {
  const round = parseInt(roundKey);
  const evaluation = mockEvaluations[round];
  const { strengths, improvements } = generateStrengthsAndImprovements(evaluation.categories);
  
  evaluation.strengths = strengths;
  evaluation.areasForImprovement = improvements;
  evaluation.summary = generateEvaluationSummary(evaluation.categories);
});

/**
 * Get evaluation data for a specific round
 * GET /evaluations/round/{roundNumber}
 */
export const getRoundEvaluation = async (data?: GetEvaluationRequest): Promise<{
  success: boolean;
  status: number;
  data?: RoundEvaluation;
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  const roundNumber = data?.roundNumber || 1;
  
  if (!mockEvaluations[roundNumber]) {
    return apiResponse.notFound(`Evaluation for round ${roundNumber} not found`);
  }
  
  return apiResponse.success(mockEvaluations[roundNumber]);
};

/**
 * Get all evaluations for the current user
 * GET /evaluations
 */
export const getAllEvaluations = async (): Promise<{
  success: boolean;
  status: number;
  data?: RoundEvaluation[];
  error?: { message: string; details?: Record<string, string> };
}> => {
  await delay();
  
  return apiResponse.success(Object.values(mockEvaluations));
};

// Export all endpoints
const evaluationEndpoints = {
  getRoundEvaluation,
  getAllEvaluations
};

export default evaluationEndpoints;
