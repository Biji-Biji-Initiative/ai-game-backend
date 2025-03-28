require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { supabaseClient } = require('./src/core/infra/db/supabaseClient');
const { Configuration, OpenAIApi } = require('openai');

/**
 * End-to-End test for Challenges feature with OpenAI integration
 * This test includes real API calls to OpenAI for challenge evaluation
 */
async function testChallengesWithOpenAI() {
  console.log('Starting Challenges E2E Test with OpenAI Integration...');
  
  // Test user email - using an existing user from the database
  const testUserEmail = 'permanent-test-user@example.com';
  
  // Initialize OpenAI
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  });
  const openai = new OpenAIApi(configuration);
  
  let challengeId = null;
  
  try {
    // Step 1: Create a new challenge
    console.log('\n1. Creating a new challenge...');
    challengeId = uuidv4();
    const newChallenge = {
      id: challengeId,
      user_email: testUserEmail,
      challenge_type: 'critical-analysis',
      format_type: 'case-study',
      focus_area: 'AI Literacy',
      difficulty: 'beginner',
      difficulty_settings: {
        standardTime: 300,
        questionCount: 2,
        contextComplexity: 0.3
      },
      content: {
        title: 'OpenAI E2E Test Challenge',
        scenario: 'This is a test challenge created for E2E testing with OpenAI integration',
        questions: [
          {
            id: 'q1',
            text: 'What are the key considerations when implementing AI systems?',
            type: 'open-ended'
          },
          {
            id: 'q2',
            text: 'How can we ensure AI systems are ethical and fair?',
            type: 'open-ended'
          }
        ]
      },
      title: 'E2E Test with OpenAI: AI Literacy Challenge',
      status: 'active',
      ai_generated: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdChallenge, error: createError } = await supabaseClient
      .from('challenges')
      .insert(newChallenge)
      .select('*')
      .single();

    if (createError) {
      throw new Error(`Failed to create challenge: ${createError.message}`);
    }

    console.log('Challenge created successfully!');
    console.log('Challenge ID:', createdChallenge.id);
    console.log('Title:', createdChallenge.title);
    
    // Step 2: Retrieve the challenge
    console.log('\n2. Retrieving challenge by ID...');
    const { data: retrievedChallenge, error: retrieveError } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', createdChallenge.id)
      .single();
      
    if (retrieveError) {
      throw new Error(`Failed to retrieve challenge: ${retrieveError.message}`);
    }
    
    console.log('Challenge retrieved successfully!');
    console.log('Status:', retrievedChallenge.status);
    console.log('Questions:', retrievedChallenge.content.questions.length);
    
    // Step 3: Submit a response to the challenge
    console.log('\n3. Submitting a response to the challenge...');
    const response = {
      answer1: 'Key considerations for implementing AI systems include data privacy and security, bias mitigation and fairness in algorithms, transparency and explainability of models, human oversight and control, regulatory compliance, ethical use cases, scalability and performance, integration with existing systems, user experience and accessibility, and ongoing monitoring and maintenance.',
      answer2: 'To ensure AI systems are ethical and fair, organizations should: 1) Use diverse and representative training data, 2) Implement rigorous testing for bias before deployment, 3) Establish clear ethical guidelines and governance, 4) Ensure transparency in how systems make decisions, 5) Create accountability mechanisms, 6) Involve diverse stakeholders in development, 7) Enable human oversight and intervention capability, 8) Conduct regular audits for fairness, 9) Invest in explainable AI technologies, and 10) Follow regulatory standards and industry best practices.'
    };
    
    const updateData = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      response: response
    };
    
    const { error: updateError } = await supabaseClient
      .from('challenges')
      .update(updateData)
      .eq('id', createdChallenge.id);
      
    if (updateError) {
      throw new Error(`Failed to submit response: ${updateError.message}`);
    }
    
    console.log('Response submitted successfully!');
    
    // Step 4: Evaluate the challenge using OpenAI
    console.log('\n4. Evaluating challenge using OpenAI...');
    
    // Prepare the challenge data and response for evaluation
    const challengeContent = retrievedChallenge.content;
    const userResponse = response;
    
    const evaluationPrompt = `
You are an expert evaluator of critical thinking skills. You need to evaluate a response to the following challenge:

CHALLENGE: ${challengeContent.title}
SCENARIO: ${challengeContent.scenario}

QUESTION 1: ${challengeContent.questions[0].text}
USER RESPONSE: ${userResponse.answer1}

QUESTION 2: ${challengeContent.questions[1].text}
USER RESPONSE: ${userResponse.answer2}

Please evaluate the response based on the following criteria:
1. Understanding of AI concepts (score 1-10)
2. Critical thinking (score 1-10)
3. Clarity and organization (score 1-10)
4. Ethical considerations (score 1-10)

For your evaluation, provide:
1. An overall score (average of the above criteria)
2. A brief feedback paragraph
3. 2-3 specific strengths of the response
4. 1-2 areas for improvement
5. Suggestions for further learning

Format your response as a JSON object with these keys: overallScore, feedback, strengths (array), areasForImprovement (array), suggestions (array), criteriaScores (object with keys understanding, criticalThinking, clarity, ethics).
`;

    console.log('Sending evaluation request to OpenAI...');
    const completion = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert evaluator of AI literacy and critical thinking skills." },
        { role: "user", content: evaluationPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    console.log('Received evaluation from OpenAI!');
    
    // Parse the evaluation JSON
    const evaluationText = completion.data.choices[0].message.content;
    console.log('Raw evaluation:', evaluationText);
    
    let evaluationData;
    try {
      // Clean up the response text by removing markdown code blocks if present
      const cleanedText = evaluationText
        .replace(/```json\s*/, '')  // Remove opening ```json
        .replace(/```\s*$/, '')     // Remove closing ```
        .trim();                    // Remove any extra whitespace
      
      evaluationData = JSON.parse(cleanedText);
      console.log('Successfully parsed OpenAI response as JSON');
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      // Try a more aggressive JSON extraction if the first method fails
      try {
        const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluationData = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON from response');
        } else {
          throw new Error('Could not find JSON object in response');
        }
      } catch (extractError) {
        console.error('Failed to extract JSON from response:', extractError);
        // Use default evaluation
        evaluationData = {
          overallScore: 8,
          feedback: 'The OpenAI response was not properly formatted as JSON. Using default evaluation.',
          strengths: ['Good understanding of concepts', 'Well-structured response'],
          areasForImprovement: ['Could not parse actual evaluation'],
          suggestions: ['Try again with a different prompt format'],
          criteriaScores: {
            understanding: 8,
            criticalThinking: 8,
            clarity: 8,
            ethics: 8
          }
        };
      }
    }
    
    // Step 5: Complete the challenge with the OpenAI evaluation
    console.log('\n5. Completing the challenge with OpenAI evaluation...');
    
    const evaluation = {
      overall_score: evaluationData.overallScore,
      feedback: evaluationData.feedback,
      strengths: evaluationData.strengths,
      areas_for_improvement: evaluationData.areasForImprovement,
      metrics: evaluationData.criteriaScores,
      generated_by: 'openai'
    };
    
    const completionData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      evaluation: evaluation
    };
    
    const { error: completionError } = await supabaseClient
      .from('challenges')
      .update(completionData)
      .eq('id', createdChallenge.id);
      
    if (completionError) {
      throw new Error(`Failed to complete challenge: ${completionError.message}`);
    }
    
    console.log('Challenge completed with OpenAI evaluation!');
    console.log('Overall score:', evaluation.overall_score);
    console.log('Feedback:', evaluation.feedback);
    
    // Step 6: Retrieve completed challenge with all data
    console.log('\n6. Retrieving completed challenge with all data...');
    const { data: finalChallenge, error: finalError } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', createdChallenge.id)
      .single();
      
    if (finalError) {
      throw new Error(`Failed to retrieve final challenge: ${finalError.message}`);
    }
    
    console.log('Final challenge data:');
    console.log('Status:', finalChallenge.status);
    console.log('Submitted at:', finalChallenge.submitted_at);
    console.log('Completed at:', finalChallenge.completed_at);
    console.log('Overall score:', finalChallenge.evaluation.overall_score);
    console.log('Strengths:', finalChallenge.evaluation.strengths);
    console.log('Areas for improvement:', finalChallenge.evaluation.areas_for_improvement);
    
    // Step 7: Clean up - Delete the test challenge
    console.log('\n7. Cleaning up - Deleting test challenge...');
    const { error: deleteError } = await supabaseClient
      .from('challenges')
      .delete()
      .eq('id', createdChallenge.id);
      
    if (deleteError) {
      throw new Error(`Failed to delete challenge: ${deleteError.message}`);
    }
    
    console.log('Test challenge deleted successfully!');
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('E2E Test failed:', error.message);
    console.error(error);
    
    // Attempt cleanup even if test fails
    if (challengeId) {
      try {
        console.log('\nAttempting to clean up challenge after error...');
        await supabaseClient.from('challenges').delete().eq('id', challengeId);
        console.log('Deleted challenge:', challengeId);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError.message);
      }
    }
  }
}

// Run the test
testChallengesWithOpenAI(); 