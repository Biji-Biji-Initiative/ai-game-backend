require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const container = require('./src/config/container');
const { supabaseClient } = require('./src/core/infra/db/supabaseClient');

/**
 * End-to-End test for Challenge Evaluation with OpenAI Responses API
 * This test uses the actual implementation from your codebase
 */
async function testChallengeEvaluationE2E() {
  console.log('Starting Challenge Evaluation E2E Test with Responses API...');
  
  // Get dependencies from container
  const openAIClient = container.get('openAIClient');
  const openAIStateManager = container.get('openAIStateManager');
  const evaluationService = container.get('evaluationService');
  
  // Test user email - using an existing user from the database
  const testUserEmail = 'permanent-test-user@example.com';
  
  let challengeId = null;
  let threadId = null;
  
  try {
    // Step 1: Create a new challenge
    console.log('\n1. Creating a new challenge...');
    challengeId = uuidv4();
    threadId = uuidv4(); // Create a thread ID for this challenge
    
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
        title: 'E2E Test Challenge with Responses API',
        scenario: 'This is a test challenge created for E2E testing with the Responses API',
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
      title: 'E2E Test: AI Literacy Challenge',
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
    
    // Create a conversation state for this challenge
    console.log('\n2. Creating a conversation state for the challenge...');
    const conversationState = await openAIStateManager.createConversationState(
      testUserEmail,
      `challenge:${challengeId}`,
      {
        challenge: {
          id: challengeId,
          title: createdChallenge.title,
          threadId
        }
      }
    );
    
    console.log('Conversation state created successfully!');
    console.log('State ID:', conversationState.id);
    
    // Step 3: Submit a response to the challenge
    console.log('\n3. Submitting a response to the challenge...');
    const responses = [
      'Key considerations for implementing AI systems include data privacy and security, bias mitigation and fairness in algorithms, transparency and explainability of models, human oversight and control, regulatory compliance, ethical use cases, scalability and performance, integration with existing systems, user experience and accessibility, and ongoing monitoring and maintenance.',
      'To ensure AI systems are ethical and fair, organizations should: 1) Use diverse and representative training data, 2) Implement rigorous testing for bias before deployment, 3) Establish clear ethical guidelines and governance, 4) Ensure transparency in how systems make decisions, 5) Create accountability mechanisms, 6) Involve diverse stakeholders in development, 7) Enable human oversight and intervention capability, 8) Conduct regular audits for fairness, 9) Invest in explainable AI technologies, and 10) Follow regulatory standards and industry best practices.'
    ];
    
    const updateData = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      response: {
        answer1: responses[0],
        answer2: responses[1]
      }
    };
    
    const { error: updateError } = await supabaseClient
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId);
      
    if (updateError) {
      throw new Error(`Failed to submit response: ${updateError.message}`);
    }
    
    console.log('Response submitted successfully!');
    
    // Step 4: Evaluate the challenge using the actual challengeEvaluationService
    console.log('\n4. Evaluating challenge using the actual challengeEvaluationService...');
    
    // Get the challenge with responses
    const { data: challengeWithResponses } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
    
    // Format the challenge for the evaluation service
    const challengeForEvaluation = {
      id: challengeWithResponses.id,
      userId: testUserEmail,
      challengeType: challengeWithResponses.challenge_type,
      formatType: challengeWithResponses.format_type,
      focusArea: challengeWithResponses.focus_area,
      difficulty: challengeWithResponses.difficulty,
      title: challengeWithResponses.title,
      content: challengeWithResponses.content,
      // Add questions field which is expected by the schema
      questions: challengeWithResponses.content.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type
      }))
    };
    
    // Format the userResponse as expected by the evaluation service
    // The service expects either a string or an array of objects with answer fields
    const formattedUserResponse = challengeWithResponses.response.answer1 + "\n\n" + challengeWithResponses.response.answer2;
    
    console.log('Using the evaluationService to evaluate the response...');
    const evaluation = await evaluationService.evaluateResponse(
      challengeForEvaluation, 
      formattedUserResponse,
      { 
        threadId,
        temperature: 0.7
      }
    );
    
    console.log('Evaluation completed successfully!');
    console.log('Overall Score:', evaluation.overallScore || evaluation.score);
    console.log('Feedback:', evaluation.feedback || evaluation.overallFeedback);
    console.log('Strengths:', evaluation.strengths);
    console.log('Areas for Improvement:', evaluation.areasForImprovement || evaluation.improvements);
    
    // Step 5: Update the challenge with the evaluation
    console.log('\n5. Updating challenge with evaluation results...');
    
    const completionData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      evaluation: evaluation
    };
    
    const { error: completionError } = await supabaseClient
      .from('challenges')
      .update(completionData)
      .eq('id', challengeId);
      
    if (completionError) {
      throw new Error(`Failed to complete challenge: ${completionError.message}`);
    }
    
    console.log('Challenge updated with evaluation successfully!');
    
    // Step 6: Retrieve completed challenge with all data
    console.log('\n6. Retrieving completed challenge with all data...');
    const { data: finalChallenge, error: finalError } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
      
    if (finalError) {
      throw new Error(`Failed to retrieve final challenge: ${finalError.message}`);
    }
    
    console.log('Final challenge data:');
    console.log('Status:', finalChallenge.status);
    console.log('Submitted at:', finalChallenge.submitted_at);
    console.log('Completed at:', finalChallenge.completed_at);
    console.log('Overall score:', finalChallenge.evaluation.overallScore || finalChallenge.evaluation.score);
    
    // Step 7: Clean up - Delete the test data
    console.log('\n7. Cleaning up - Deleting test data...');
    
    // Delete conversation state
    await openAIStateManager.deleteConversationState(conversationState.id);
    console.log('Deleted conversation state');
    
    // Delete challenge
    const { error: deleteError } = await supabaseClient
      .from('challenges')
      .delete()
      .eq('id', challengeId);
      
    if (deleteError) {
      throw new Error(`Failed to delete challenge: ${deleteError.message}`);
    }
    
    console.log('Test challenge deleted successfully!');
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('E2E Test failed:', error.message);
    console.error(error);
    
    // Attempt cleanup even if test fails
    try {
      console.log('\nAttempting cleanup after error...');
      
      // Check if conversation state exists and delete it
      if (testUserEmail && challengeId) {
        const state = await openAIStateManager.findOrCreateConversationState(testUserEmail, `challenge:${challengeId}`);
        if (state) {
          await openAIStateManager.deleteConversationState(state.id);
          console.log('Deleted conversation state');
        }
      }
      
      // Check if challenge exists and delete it
      if (challengeId) {
        const { data: challengeExists } = await supabaseClient
          .from('challenges')
          .select('id')
          .eq('id', challengeId)
          .maybeSingle();
          
        if (challengeExists) {
          await supabaseClient.from('challenges').delete().eq('id', challengeId);
          console.log('Deleted challenge:', challengeId);
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
  }
}

// Run the test
testChallengeEvaluationE2E(); 