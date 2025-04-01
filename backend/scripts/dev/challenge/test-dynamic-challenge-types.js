// Test file for dynamic challenge types
require('dotenv').config();

console.log('Loading dependencies...');

try {
  const responsesApiClient = require('./src/utils/api/responsesApiClient');
  console.log('✅ Responses API client loaded');
  
  const challengeTypeRepository = require('./src/repositories/challengeTypeRepository');
  console.log('✅ Challenge type repository loaded');
  
  const { logger } = require('./src/utils/logger');
  console.log('✅ Logger loaded');
  
  console.log('Testing dynamic challenge type creation with parent-child relationships');

  /**
   * Test dynamic challenge type creation
   */
  async function testDynamicTypeCreation() {
    try {
      // 1. Create a custom type first (parent type)
      const parentTypeCode = 'parent-custom-type-' + Date.now().toString().slice(-6);
      const parentTypeName = 'Parent Custom Type';
      const parentTypeDescription = 'A parent custom challenge type';
      
      console.log(`Creating parent type: ${parentTypeName} (${parentTypeCode})`);
      
      const parentTypeId = await challengeTypeRepository.upsertChallengeType({
        code: parentTypeCode,
        name: parentTypeName,
        description: parentTypeDescription,
        metadata: {
          learningGoals: ['Critical thinking', 'Creativity'],
          difficulty: 'intermediate'
        }
      });
      
      if (!parentTypeId) {
        throw new Error('Failed to create parent type - no ID returned');
      }
      
      console.log(`Parent type created with ID: ${parentTypeId}`);
      
      // 2. Create a child type linked to the parent
      const childTypeCode = 'child-custom-type-' + Date.now().toString().slice(-6);
      const childTypeName = 'Child Custom Type';
      const childTypeDescription = 'A child custom challenge type';
      
      console.log(`Creating child type: ${childTypeName} (${childTypeCode})`);
      
      const childTypeId = await challengeTypeRepository.upsertChallengeType({
        code: childTypeCode,
        name: childTypeName,
        description: childTypeDescription,
        parentTypeCode: parentTypeCode,
        metadata: {
          learningGoals: ['Specialized knowledge', 'Deep analysis'],
          difficulty: 'advanced',
          parentTypeCode: parentTypeCode
        }
      });
      
      if (!childTypeId) {
        throw new Error('Failed to create child type - no ID returned');
      }
      
      console.log(`Child type created with ID: ${childTypeId}`);
      
      // 3. Retrieve all types to verify creation
      const allTypes = await challengeTypeRepository.getChallengeTypes();
      
      if (!allTypes || allTypes.length === 0) {
        throw new Error('Failed to retrieve challenge types from repository');
      }
      
      console.log('\nAll Challenge Types:');
      allTypes.forEach(type => {
        console.log(`- ${type.name} (${type.code}): ${type.description}`);
        if (type.parent_type_id) {
          console.log(`  Parent ID: ${type.parent_type_id}`);
        }
      });
      
      // 4. Retrieve the specific child type to verify parent relationship
      const childType = await challengeTypeRepository.getChallengeTypeByCode(childTypeCode);
      
      if (!childType) {
        throw new Error(`Failed to retrieve child type with code: ${childTypeCode}`);
      }
      
      console.log('\nVerifying parent-child relationship:');
      console.log('Child type object:', JSON.stringify(childType, null, 2));
      
      if (!childType.parent_type_id) {
        throw new Error('Child type has no parent reference');
      }
      
      console.log(`Child type: ${childType.name}`);
      
      const parentType = await challengeTypeRepository.getChallengeTypeById(childType.parent_type_id);
      
      if (!parentType) {
        throw new Error(`Parent type with ID ${childType.parent_type_id} not found`);
      }
      
      console.log(`Parent type: ${parentType.name}`);
      console.log('✅ Parent-child relationship verified successfully');
      
      // 5. Test generating a challenge with the custom type
      const user = {
        fullName: 'Test User',
        professionalTitle: 'Software Engineer',
        dominantTraits: ['analyticalThinking', 'creativity'],
        focusAreas: ['AI Ethics', 'Human-AI Collaboration']
      };
      
      const challengeParams = {
        challengeTypeCode: childTypeCode,
        formatTypeCode: 'open-ended',
        focusArea: 'AI Ethics',
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
Type: ${challengeParams.challengeTypeCode} (${childTypeName}: ${childTypeDescription})
Parent Type: ${parentTypeCode} (${parentTypeName}: ${parentTypeDescription})
Format: ${challengeParams.formatTypeCode}
Difficulty: ${challengeParams.difficulty}
Focus Area: ${challengeParams.focusArea}

SPECIAL INSTRUCTIONS
- Create a challenge that utilizes the characteristics of the specified custom type
- The challenge should inherit aspects from both the child and parent type

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
  "typeMetadata": {
    "name": "${childTypeName}",
    "description": "${childTypeDescription}",
    "parent": "${parentTypeName}"
  }
}`;
      
      // Create messages for the Responses API
      const messages = [
        {
          role: responsesApiClient.MessageRole.SYSTEM,
          content: 'You are an AI challenge creator specializing in personalized learning challenges. Always return your response as a JSON object with all necessary challenge details, formatted as valid, parsable JSON.'
        },
        {
          role: responsesApiClient.MessageRole.USER,
          content: prompt
        }
      ];
      
      console.log('\nGenerating challenge with custom type...');
      const response = await responsesApiClient.sendJsonMessage(messages, {
        model: 'gpt-4o',
        temperature: 0.7
      });
      
      if (!response) {
        throw new Error('No response received from Responses API');
      }
      
      console.log('Challenge generation response received');
      
      if (!response.data) {
        throw new Error('Response did not contain valid JSON data');
      }
      
      console.log(`\nGenerated challenge: ${response.data.title}`);
      console.log('Type metadata:', response.data.typeMetadata);
      console.log('Questions:', response.data.questions.length);
      console.log('\n✅ Successfully generated challenge with custom type');
      
      return 'Tests completed successfully';
    } catch (error) {
      console.error('TEST ERROR:', error);
      throw error;
    }
  }

  // Run the test
  testDynamicTypeCreation()
    .then(result => {
      console.log(result);
      process.exit(0);
    })
    .catch(error => {
      console.error('ERROR:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('SETUP ERROR:', error);
  process.exit(1);
} 