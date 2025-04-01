/**
 * Evaluation System Setup Demonstration
 * 
 * This script demonstrates how the evaluation system is set up to work with OpenAI's Responses API
 * without actually making API calls.
 */

require('dotenv').config();
const EvaluationPromptBuilder = require('../src/core/prompt/builders/EvaluationPromptBuilder');
const Evaluation = require('../src/core/evaluation/models/Evaluation');

console.log('Starting Evaluation System demonstration...');

// Test challenge data
const testChallenge = {
  id: 'test-challenge-id',
  title: 'AI Ethics Scenario Analysis',
  challengeType: 'analysis',
  focusArea: 'AI Ethics',
  content: {
    context: 'A healthcare company is developing an AI system to predict patient readmission.',
    scenario: 'The AI system consistently shows higher false positive rates for certain demographic groups.',
    instructions: 'Analyze the ethical implications of this scenario and propose a framework for addressing the bias.'
  }
};

// Abbreviated user response for display purposes
const testUserResponse = `
I'll analyze the ethical implications of the AI system showing higher false positive rates for certain demographic groups...

First, let's consider the ethical implications:
1. Fairness and Equity: The disparity in false positive rates raises serious fairness concerns.
2. Non-maleficence: Higher false positives can lead to unnecessary interventions and harm.
3. Autonomy: Patient autonomy may be undermined without transparency.
4. Trust: Bias could damage trust in both the healthcare institution and AI systems.
5. Resource Allocation: Healthcare resources may be inequitably distributed.

Framework for Addressing the Bias:
1. Data Audit and Bias Detection
2. Technical Interventions
3. Governance Structure
4. Clinical Integration Guidelines
5. Transparency and Communication

Implementation would require ongoing assessment and continuous improvement.
`;

// Test user data
const testUser = {
  id: 'test-user-id',
  name: 'Test User',
  skillLevel: 'intermediate',
  focusAreas: ['AI Ethics', 'Critical Thinking'],
  learningGoals: ['Understand ethical frameworks in AI', 'Improve analysis skills']
};

// Test history data
const testHistory = {
  previousScores: {
    overall: 75,
    ethical_reasoning: 78,
    comprehensiveness: 72,
    clarity: 76
  },
  consistentStrengths: ['ethical_reasoning'],
  areasNeedingImprovement: ['comprehensiveness']
};

/**
 * Run the demonstration
 */
async function runDemonstration() {
  try {
    console.log('Building evaluation prompt using EvaluationPromptBuilder...');
    
    // Use the EvaluationPromptBuilder directly
    const prompt = await EvaluationPromptBuilder.build({
      challenge: testChallenge,
      userResponse: testUserResponse,
      user: testUser,
      evaluationHistory: testHistory
    });
    
    console.log('Prompt built successfully!');
    console.log('\n--- PROMPT PREVIEW ---');
    console.log(prompt.substring(0, 500) + '...');
    console.log('--- END PREVIEW ---\n');
    
    // Simulated evaluation response from OpenAI
    const simulatedResponse = {
      categoryScores: {
        ethical_reasoning: 85,
        comprehensiveness: 78,
        clarity: 82,
        practical_application: 80
      },
      overallScore: 82,
      overallFeedback: 'The response demonstrates strong ethical reasoning with a comprehensive analysis of the implications of bias in the AI system. The framework proposed is well-structured and addresses key areas for mitigation.',
      strengths: [
        'Strong identification of ethical principles at stake',
        'Comprehensive framework for addressing bias'
      ],
      areasForImprovement: [
        'Could provide more specific examples of how biases manifest',
        'Framework could include more details on implementation'
      ]
    };
    
    console.log('Creating Evaluation model from simulated API response...');
    
    // Create an Evaluation model from the simulated response
    const evaluation = new Evaluation({
      userId: testUser.id,
      challengeId: testChallenge.id,
      score: simulatedResponse.overallScore,
      categoryScores: simulatedResponse.categoryScores,
      overallFeedback: simulatedResponse.overallFeedback,
      strengths: simulatedResponse.strengths,
      areasForImprovement: simulatedResponse.areasForImprovement,
      userContext: {
        skillLevel: testUser.skillLevel,
        focusAreas: testUser.focusAreas,
        learningGoals: testUser.learningGoals,
        previousScores: testHistory.previousScores
      }
    });
    
    // Display evaluation metrics
    console.log('\nEVALUATION RESULTS:');
    console.log(`Overall Score: ${evaluation.score}/100`);
    console.log(`Performance Level: ${evaluation.getPerformanceLevel()}`);
    
    console.log('\nCATEGORY SCORES:');
    Object.entries(evaluation.categoryScores).forEach(([category, score]) => {
      console.log(`- ${category}: ${score}`);
    });
    
    console.log('\nSTRENGTHS:');
    evaluation.strengths.forEach((strength, index) => {
      console.log(`${index + 1}. ${strength}`);
    });
    
    console.log('\nAREAS FOR IMPROVEMENT:');
    evaluation.areasForImprovement.forEach((area, index) => {
      console.log(`${index + 1}. ${area}`);
    });
    
    console.log('\nOVERALL FEEDBACK:');
    console.log(evaluation.overallFeedback);
    
    console.log('\nPERSONALIZED FEEDBACK:');
    const personalizedFeedback = evaluation.getPersonalizedFeedback();
    console.log(`Skill Level Feedback: ${personalizedFeedback.skillLevelFeedback}`);
    console.log(`Focus Area Relevance: ${personalizedFeedback.focusAreaRelevance}`);
    console.log(`Growth Insights: ${personalizedFeedback.growthInsights}`);
    
    console.log('\nDemonstration completed successfully!');
  } catch (error) {
    console.error('Error in demonstration:');
    console.error(error);
  }
}

// Run the demonstration
runDemonstration(); 