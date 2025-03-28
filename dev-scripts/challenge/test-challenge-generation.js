// Test file for debugging challenge generation
require('dotenv').config();
const responsesApiClient = require('./src/utils/api/responsesApiClient');

// Check if the Responses API is available
console.log(`Testing challenge generation with responsesApiClient`);

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
      challengeTypeCode: 'ai-ethical-paradox', // This is a novel challenge type
      formatTypeCode: 'scenario-analysis',
      focusArea: 'Human-AI Collaboration',
      difficulty: 'advanced'
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

SPECIAL INSTRUCTIONS
- You are encouraged to create a novel challenge type called "AI Ethical Paradox" that presents complex ethical dilemmas with no clear right answer
- The scenario should involve collaboration between humans and AI systems
- Make this an advanced-level challenge with thought-provoking content

CREATIVITY GUIDANCE
- Variation level: 90%
- Prioritize creative, novel scenarios that challenge conventional thinking.

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
  },
  "typeMetadata": {
    "name": "AI Ethical Paradox",
    "description": "Challenges that present complex ethical dilemmas with no clear right answer",
    "parent": "critical-thinking"
  }
}`;
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: 'You are an AI challenge creator specializing in personalized learning challenges. Always return your response as a JSON object with all necessary challenge details, formatted as valid, parsable JSON. You can create novel challenge types beyond the standard categories when appropriate for the user.'
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: prompt
      }
    ];
    
    // Send the JSON message using responsesApiClient
    console.log('Sending request using responsesApiClient...');
    const response = await responsesApiClient.sendJsonMessage(messages, {
      model: 'gpt-4o',
      temperature: 0.8 // Higher temperature for more creativity
    });
    
    console.log('\nRESPONSE RECEIVED:');
    console.log('Response ID:', response.responseId);
    
    if (response.data) {
      console.log('\nJSON PARSED SUCCESSFULLY:');
      console.log('- Title:', response.data.title);
      console.log('- Content Keys:', Object.keys(response.data.content || {}));
      console.log('- Questions:', response.data.questions?.length || 0);
      
      // Display type metadata
      if (response.data.typeMetadata) {
        console.log('\nTYPE METADATA:');
        console.log('- Name:', response.data.typeMetadata.name);
        console.log('- Description:', response.data.typeMetadata.description);
        console.log('- Parent Type:', response.data.typeMetadata.parent);
      }
      
      // Display full challenge data
      console.log('\nFULL CHALLENGE DATA:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Display questions in a more readable format
      console.log('\nQUESTIONS:');
      response.data.questions.forEach((question, index) => {
        console.log(`\nQuestion ${index + 1}: ${question.text}`);
        console.log(`Type: ${question.type}`);
        if (question.options) {
          console.log('Options:');
          question.options.forEach((option, i) => {
            console.log(`  ${i + 1}. ${option}`);
          });
        }
      });
      
      // Display evaluation criteria
      if (response.data.evaluationCriteria) {
        console.log('\nEVALUATION CRITERIA:');
        Object.entries(response.data.evaluationCriteria).forEach(([key, criteria]) => {
          console.log(`- ${key}: ${criteria.description} (weight: ${criteria.weight})`);
        });
      }
    } else {
      console.error('\nNO JSON DATA RECEIVED');
    }
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

// Run the test
testJSONGeneration().catch(console.error);
