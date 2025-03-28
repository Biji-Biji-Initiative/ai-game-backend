/**
 * Test Evaluation Flow with Responses API
 * 
 * This script tests the complete evaluation flow from creating a prompt
 * to sending it to the Responses API and processing the results.
 * 
 * Run with: node scripts/test-evaluation-flow.js
 */

require('dotenv').config();
const EvaluationPromptBuilder = require('../src/core/prompt/builders/EvaluationPromptBuilder');
const axios = require('axios');
const Evaluation = require('../src/core/evaluation/models/Evaluation');
const { createClient } = require('@supabase/supabase-js');

// Set API key explicitly - using the key provided in .env
const OPENAI_API_KEY = "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";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client if credentials are available
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client initialized successfully');
} else {
  console.warn('SUPABASE_URL or SUPABASE_KEY not provided in .env file. Database operations will be skipped.');
}

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

// Test user response
const testUserResponse = `
I'll analyze the ethical implications of the AI system showing higher false positive rates for certain demographic groups and propose a framework for addressing this bias.

First, let's consider the ethical implications:

1. **Fairness and Equity**: The disparity in false positive rates across demographic groups raises serious fairness concerns. This system is not providing equitable outcomes across all populations.

2. **Non-maleficence**: Higher false positives can lead to unnecessary interventions, stress, and waste of healthcare resources. This could disproportionately harm affected demographic groups.

3. **Autonomy**: Patient autonomy may be undermined if clinical decisions are influenced by biased AI recommendations without transparency.

4. **Trust**: If discovered, this bias could damage trust in both the healthcare institution and AI systems in healthcare broadly.

5. **Resource Allocation**: Healthcare resources may be inequitably distributed based on biased recommendations.

Framework for Addressing the Bias:

1. **Data Audit and Bias Detection**
   - Perform comprehensive audit of training data representation
   - Apply statistical methods to quantify disparities across demographic groups
   - Establish ongoing monitoring processes for bias detection

2. **Technical Interventions**
   - Implement fairness constraints in model development
   - Consider reweighting techniques to balance performance across groups
   - Explore adversarial debiasing approaches
   - Test multiple model architectures for fairness outcomes

3. **Governance Structure**
   - Create an ethics review board with diverse membership
   - Include representatives from affected demographic groups
   - Establish clear accountability for addressing identified biases
   - Develop standards for acceptable disparities in model performance

4. **Clinical Integration Guidelines**
   - Develop clear protocols for how AI recommendations should inform clinical decisions
   - Train healthcare professionals on system limitations and potential biases
   - Create override mechanisms for clinicians when AI recommendations seem inappropriate
   - Implement confidence scores with recommendations

5. **Transparency and Communication**
   - Document model limitations and known disparities
   - Create appropriate disclosure mechanisms for patients
   - Establish feedback channels for reporting concerns about system outputs
   - Regularly publish bias audit results

Implementation of this framework would require ongoing assessment and adaptation as new data emerges. The goal should be continuous improvement, acknowledging that perfect fairness may be difficult to achieve while ensuring the system's benefits are distributed equitably across all demographic groups.
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
 * Run the complete evaluation flow test
 */
async function testEvaluationFlow() {
  try {
    console.log('Starting evaluation flow test with live services...');
    
    // 1. Build the evaluation prompt
    console.log('Building evaluation prompt...');
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
    
    console.log('Sending request to OpenAI Responses API...');
    console.log('API Key available:', !!OPENAI_API_KEY);
    
    // Create a system message instructing the model to evaluate
    const systemMessage = 'You are an expert evaluator of AI ethics analysis. Provide a detailed, fair evaluation of the user\'s response in JSON format.';
    
    // Make the API request to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Received response from OpenAI!');
    console.log('Response ID:', response.data.id);
    console.log('Model used:', response.data.model);
    console.log('Completion tokens:', response.data.usage?.completion_tokens);
    console.log('Prompt tokens:', response.data.usage?.prompt_tokens);
    
    // 3. Process the response
    const responseContent = response.data.choices[0].message.content;
    console.log('\n--- RESPONSE PREVIEW ---');
    console.log(responseContent.substring(0, 300) + '...');
    console.log('--- END PREVIEW ---\n');
    
    const parsedResponse = JSON.parse(responseContent);
    
    console.log('Parsed evaluation data:');
    console.log(`Overall Score: ${parsedResponse.overallScore}`);
    console.log(`Category Scores:`, parsedResponse.categoryScores);
    console.log(`Strengths: ${parsedResponse.strengths.length}`);
    console.log(`Areas for Improvement: ${parsedResponse.areasForImprovement.length}`);
    
    // 4. Create an Evaluation model from the response
    const evaluation = new Evaluation({
      userId: testUser.id,
      challengeId: testChallenge.id,
      score: parsedResponse.overallScore,
      categoryScores: parsedResponse.categoryScores,
      overallFeedback: parsedResponse.overallFeedback,
      strengths: parsedResponse.strengths,
      strengthAnalysis: parsedResponse.strengthAnalysis || [],
      areasForImprovement: parsedResponse.areasForImprovement,
      improvementPlans: parsedResponse.improvementPlans || [],
      nextSteps: parsedResponse.recommendations?.nextSteps || '',
      recommendedResources: parsedResponse.recommendations?.resources || [],
      recommendedChallenges: parsedResponse.recommendations?.recommendedChallenges || [],
      userContext: {
        skillLevel: testUser.skillLevel,
        focusAreas: testUser.focusAreas,
        learningGoals: testUser.learningGoals,
        previousScores: testHistory.previousScores,
        completedChallengeCount: 5
      }
    });
    
    console.log('Created Evaluation model instance');
    console.log(`Performance Level: ${evaluation.getPerformanceLevel()}`);
    console.log(`Valid: ${evaluation.isValid()}`);
    
    // 5. Save the evaluation to Supabase (if available)
    const saveToDatabase = false; // Set to true to actually save
    
    if (saveToDatabase && supabase) {
      console.log('Saving evaluation to database...');
      
      const { data, error } = await supabase
        .from('evaluations')
        .insert([{
          id: evaluation.id,
          user_id: evaluation.userId,
          challenge_id: evaluation.challengeId,
          score: evaluation.score,
          category_scores: evaluation.categoryScores,
          overall_feedback: evaluation.overallFeedback,
          strengths: evaluation.strengths,
          strength_analysis: evaluation.strengthAnalysis,
          areas_for_improvement: evaluation.areasForImprovement,
          improvement_plans: evaluation.improvementPlans,
          next_steps: evaluation.nextSteps,
          recommended_resources: evaluation.recommendedResources,
          recommended_challenges: evaluation.recommendedChallenges,
          user_context: evaluation.userContext,
          metrics: evaluation.metrics,
          created_at: evaluation.createdAt
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error saving to database:', error);
      } else {
        console.log('Evaluation saved to database successfully!');
        console.log(`Evaluation ID: ${data.id}`);
      }
    } else if (saveToDatabase) {
      console.log('Skipping database save as Supabase client is not available');
    }
    
    // 6. Generate personalized feedback
    const personalizedFeedback = evaluation.getPersonalizedFeedback();
    console.log('\nPersonalized Feedback:');
    console.log(`Skill Level Feedback: ${personalizedFeedback.skillLevelFeedback}`);
    console.log(`Focus Area Relevance: ${personalizedFeedback.focusAreaRelevance}`);
    console.log(`Growth Insights: ${personalizedFeedback.growthInsights}`);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error in evaluation flow test:');
    
    if (error.response) {
      // OpenAI API error
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // Network error
      console.error('Network Error: Could not connect to OpenAI API');
    } else {
      // Other errors
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testEvaluationFlow(); 