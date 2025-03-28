/**
 * OpenAI Chat Completions API Evaluation Test
 * 
 * This script demonstrates the evaluation flow using OpenAI's Chat Completions API
 * with structured JSON output.
 */

require('dotenv').config();
const axios = require('axios');

// Use API key from .env
const OPENAI_API_KEY = "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";

// Verify API key exists
if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in .env file');
  process.exit(1);
}

// Example user response to evaluate
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

// Create a basic evaluation prompt
const challengeContext = `
A healthcare company is developing an AI system to predict patient readmission. The AI system consistently shows higher false positive rates for certain demographic groups. Analyze the ethical implications of this scenario and propose a framework for addressing the bias.
`;

// Define the evaluation prompt with structured output format
const createEvaluationPrompt = () => {
  return `
EVALUATION TASK:
Evaluate the user's response to the following healthcare AI ethics challenge.

CHALLENGE INFORMATION:
${challengeContext}

USER RESPONSE:
${userResponse}

EVALUATION CRITERIA:
- ethical_reasoning (0-30 points): Evaluate depth and nuance of ethical analysis and reasoning
- comprehensiveness (0-25 points): Assess coverage of relevant ethical dimensions and perspectives
- clarity (0-25 points): Assess organization, clarity of expression, and logical flow of ideas
- practical_application (0-20 points): Judge how well ethical principles are applied to concrete situations

The total maximum score is 100 points.

RESPONSE FORMAT:
Your evaluation should be formatted as a JSON object with the following structure:

{
  "categoryScores": {
    "ethical_reasoning": <score from 0 to 30>,
    "comprehensiveness": <score from 0 to 25>,
    "clarity": <score from 0 to 25>,
    "practical_application": <score from 0 to 20>
  },
  "overallScore": <sum of all category scores, 0-100>,
  "overallFeedback": "Comprehensive evaluation of the user's response...",
  "strengths": [
    "Specific strength 1",
    "Specific strength 2"
  ],
  "areasForImprovement": [
    "Specific area for improvement 1",
    "Specific area for improvement 2"
  ]
}

Always format your entire response as a JSON object. Do not include any text before or after the JSON object.
`;
};

/**
 * Make a request to OpenAI Chat Completions API
 */
async function callOpenAI() {
  try {
    console.log('Sending request to OpenAI Chat Completions API...');
    
    const prompt = createEvaluationPrompt();
    console.log('\n--- PROMPT PREVIEW ---');
    console.log(prompt.substring(0, 500) + '...');
    console.log('--- END PREVIEW ---\n');
    
    // System message for the AI
    const systemMessage = 'You are an expert evaluator of AI ethics analyses. Provide a detailed, fair evaluation of the user\'s response in structured JSON format.';
    
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
    
    console.log('Received response from OpenAI Chat Completions API');
    console.log('Response ID:', response.data.id);
    console.log('Model used:', response.data.model);
    console.log('Completion tokens:', response.data.usage?.completion_tokens);
    console.log('Prompt tokens:', response.data.usage?.prompt_tokens);
    
    // Get response content
    const responseContent = response.data.choices[0].message.content;
    console.log('\n--- RESPONSE PREVIEW ---');
    console.log(responseContent.substring(0, 500) + '...');
    console.log('--- END PREVIEW ---\n');
    
    // Parse the JSON response
    const evaluationData = JSON.parse(responseContent);
    
    // Display key evaluation metrics
    console.log('EVALUATION RESULTS:');
    console.log(`Overall Score: ${evaluationData.overallScore}/100`);
    
    console.log('\nCATEGORY SCORES:');
    Object.entries(evaluationData.categoryScores).forEach(([category, score]) => {
      console.log(`- ${category}: ${score}`);
    });
    
    console.log('\nSTRENGTHS:');
    evaluationData.strengths.forEach((strength, index) => {
      console.log(`${index + 1}. ${strength}`);
    });
    
    console.log('\nAREAS FOR IMPROVEMENT:');
    evaluationData.areasForImprovement.forEach((area, index) => {
      console.log(`${index + 1}. ${area}`);
    });
    
    console.log('\nOVERALL FEEDBACK:');
    console.log(evaluationData.overallFeedback);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during API request:');
    
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

callOpenAI(); 