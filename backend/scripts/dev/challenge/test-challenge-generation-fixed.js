// Test file for debugging challenge generation
require('dotenv').config();
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Check if the Responses API is available
const isResponsesApiAvailable = !!openai.responses;
console.log(`OpenAI Responses API availability: ${isResponsesApiAvailable ? 'Available' : 'Not Available'}`);

/**
 *
 */
async function testJSONGeneration() {
  try {
    // Sample user and challenge parameters
    const user = {
      fullName: 'Test User',
      professionalTitle: 'Software Engineer',
      dominantTraits: ['analyticalThinking', 'creativity'],
      focusAreas: ['AI Ethics', 'Human-AI Collaboration']
    };
    
    const challengeParams = {
      challengeTypeCode: 'critical-thinking',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate'
    };
    
    // Create prompt content
    const prompt = `CHALLENGE GENERATION TASK
Generate a challenge for the user based on their profile and the specified parameters.

USER PROFILE
Name: ${user.fullName}
Professional Title: ${user.professionalTitle}
Focus Areas: ${user.focusAreas.join(', ')}
Dominant Traits: ${user.dominantTraits.join(', ')}

CHALLENGE PARAMETERS
Type: ${challengeParams.challengeTypeCode}
Format: ${challengeParams.formatTypeCode}
Difficulty: ${challengeParams.difficulty}
Focus Area: ${challengeParams.focusArea}

CREATIVITY GUIDANCE
- Variation level: 70%
- Balance creativity with structured learning.

RESPONSE FORMAT
Return the challenge as a JSON object with the following structure:
{
  "title": "Challenge title",
  "content": {
    "context": "Background information and context",
    "scenario": "Specific scenario or problem statement",
    "instructions": "What the user needs to do"
  },
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "type": "open-ended | multiple-choice | reflection",
      "options": ["Option 1", "Option 2", "Option 3"] // For multiple-choice only
    }
  ],
  "evaluationCriteria": {
    "criteria1": {
      "description": "Description of criteria",
      "weight": 0.5
    }
  }
}`;
    
    // Direct API call for debugging
    console.log('Sending request to OpenAI Responses API...');
    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: 'You are an AI challenge creator specializing in personalized learning challenges. Always return your response as a JSON object with all necessary challenge details, formatted as valid, parsable JSON.',
      input: prompt,
      temperature: 0.7
    });
    
    console.log('\nRESPONSE RECEIVED:');
    console.log('Response ID:', response.id);
    console.log('Output Text:', response.output_text?.substring(0, 100) + '...');
    
    // Try to parse JSON
    try {
      const jsonData = JSON.parse(response.output_text);
      console.log('\nJSON PARSED SUCCESSFULLY:');
      console.log('- Title:', jsonData.title);
      console.log('- Content Keys:', Object.keys(jsonData.content || {}));
      console.log('- Questions:', jsonData.questions?.length || 0);
    } catch (parseError) {
      console.error('\nJSON PARSE ERROR:', parseError.message);
      console.log('Full response text:');
      console.log(response.output_text);
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response) {
      console.error('Response Error:', error.response.data);
    }
  }
}

// Run the test
testJSONGeneration().catch(console.error);
