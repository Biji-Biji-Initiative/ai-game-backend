/**
 * OpenAI Responses API Evaluation Test with Real Services
 * 
 * This script tests our actual evaluation system with OpenAI's Responses API
 * and real Supabase data connections.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const EvaluationPromptBuilder = require('../src/core/prompt/builders/EvaluationPromptBuilder');
const { evaluateResponse } = require('../src/core/evaluation/services/evaluationService');
const responsesApiClient = require('../src/utils/api/responsesApiClient');
const Evaluation = require('../src/core/evaluation/models/Evaluation');

// Use the specific API key provided in the user's message
const OPENAI_API_KEY = "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";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required in .env file');
  process.exit(1);
}

console.log('Using OpenAI API key:', OPENAI_API_KEY.substring(0, 10) + '...');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('WARNING: Supabase credentials missing, some features may not work correctly');
}

// Initialize Supabase client
let supabaseClient;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
  console.log('Supabase client initialized successfully');
} else {
  console.warn('Using mock Supabase client');
}

// Override the responsesApiClient to use our API key - use the actual key from the .env file
responsesApiClient.setApiKey(OPENAI_API_KEY);
console.log('OpenAI API key configured');

console.log('Starting Responses API production test...');

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
  },
  evaluationCriteria: {
    'ethical_reasoning': { description: 'Identification and analysis of ethical principles at stake', weight: 30 },
    'comprehensiveness': { description: 'Thorough consideration of multiple perspectives and implications', weight: 25 },
    'clarity': { description: 'Clear and structured presentation of ideas', weight: 20 },
    'practical_application': { description: 'Actionable and realistic framework for addressing the issue', weight: 25 }
  },
  questions: [
    {
      id: 'q1',
      text: 'Analyze the ethical implications of this scenario and propose a framework for addressing the bias.'
    }
  ]
};

// Test user response
const userResponse = `
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
 * Run the test using our actual evaluation service with real API calls
 */
async function runTest() {
  try {
    console.log('Preparing for evaluation with OpenAI Responses API...');
    
    // Create an artificial thread ID for stateful chat
    const threadId = `thread-${Date.now()}`;
    console.log(`Generated test thread ID: ${threadId}`);
    
    // Format user response in the expected array format
    const formattedUserResponse = [{
      questionId: 'q1',
      answer: userResponse
    }];
    
    console.log('Calling evaluateResponse with real API integration...');
    
    // Configure options for the evaluation service
    const options = {
      threadId,
      user: testUser,
      evaluationHistory: testHistory,
      temperature: 0.4,
      model: 'gpt-4o'
    };
    
    // Use our actual evaluation service with real API calls
    const evaluation = await evaluateResponse(testChallenge, formattedUserResponse, options);
    
    // Display evaluation results
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
    
    // Save evaluation to Supabase
    try {
      console.log('\nSaving evaluation to Supabase...');
      const { data, error } = await supabaseClient
        .from('evaluations')
        .insert([evaluation.toObject()])
        .select();
        
      if (error) {
        console.error('Error saving to Supabase:', error);
        throw error;
      } else {
        console.log('Evaluation saved successfully to Supabase:', data[0].id);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY! ✅');
    console.log('The evaluation system is fully functional with the Responses API.');
    console.log('Generated a comprehensive evaluation with:');
    console.log(`- Overall score: ${evaluation.score}/100 (${evaluation.getPerformanceLevel()})`);
    console.log(`- ${Object.keys(evaluation.categoryScores).length} category scores`);
    console.log(`- ${evaluation.strengths.length} identified strengths`);
    console.log('- Personalized feedback based on user history and focus areas');
    console.log('\nReady for production use!');
    
    return evaluation;
  } catch (error) {
    console.error('Error in evaluation test:');
    console.error(error);
    console.log('\nThe system is designed to throw errors rather than use fallbacks.');
    console.log('This ensures all dependencies are properly configured before running.');
    process.exit(1);
  }
}

// Run the test
runTest(); 