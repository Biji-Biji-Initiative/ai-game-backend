import { personalityLogger } from "@/core/infra/logging/domainLogger.js";
import InsightGenerator from "@/core/personality/ports/InsightGenerator.js";
'use strict';
/**
 * Mock Insight Generator
 *
 * Implements the InsightGenerator port with mock data for testing.
 */
// const InsightGenerator = require('../../core/personality/ports/InsightGenerator');
/**
 *
 */
class MockInsightGenerator extends InsightGenerator {
  /**
   * Method constructor
   */
  constructor() {
    super();
    this.logger = personalityLogger.child('mockInsightGenerator');
  }
  /**
   * Generate mock insights based on a personality profile
   * @param {import('../../core/personality/models/Personality')} profile - The personality profile
   * @returns {Promise<Object>} Generated insights
   */
  /**
   * Method generateFor
   */
  generateFor(profile) {
    this.logger.debug('Generating mock insights', {
      userId: profile.userId
    });
    // Create mock insights with some personalization based on the profile
    const mockInsights = {
      strengths: ['Analytical thinking and problem-solving', 'Clear communication and articulation of complex ideas', 'Ability to integrate creative and technical concepts'],
      focus_areas: ['Logic and reasoning', 'Communication clarity', 'Creative problem-solving'],
      recommendations: ['Further develop technical writing skills for complex topics', 'Explore more collaborative projects that leverage your communication strengths', 'Consider joining communities that focus on innovation and creative problem-solving'],
      traits: {
        analytical: {
          score: profile.personalityTraits.analytical || 65,
          description: 'Strong analytical abilities, enjoys problem-solving',
          impact: 'Enhances ability to understand complex systems and technical concepts'
        },
        creative: {
          score: profile.personalityTraits.creative || 60,
          description: 'Appreciates innovative approaches and novel solutions',
          impact: 'Contributes to finding unique perspectives on technical challenges'
        },
        communicative: {
          score: profile.personalityTraits.communicative || 75,
          description: 'Effective at expressing complex ideas clearly',
          impact: 'Facilitates knowledge sharing and explaining technical concepts'
        }
      },
      ai_preferences: {
        communication_style: 'Clear, concise explanations with technical depth',
        information_density: 'High density, with comprehensive details',
        interaction_pattern: 'Question-focused with follow-up exploration'
      }
    };
    this.logger.info('Generated mock insights', {
      userId: profile.userId
    });
    return mockInsights;
  }
}
export default MockInsightGenerator;