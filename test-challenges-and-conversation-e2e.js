require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { supabaseClient } = require('./src/core/infra/db/supabaseClient');
const ConversationStateRepository = require('./src/infra/repositories/ConversationStateRepository');

/**
 * Comprehensive End-to-End test for AI Game
 * Tests both Challenges and Conversation State features
 */
async function testComprehensiveE2E() {
  console.log('Starting Comprehensive E2E Test...');
  
  // Test user email - using an existing user from the database
  const testUserEmail = 'permanent-test-user@example.com';
  const testUserId = testUserEmail; // Using email as userId for simplicity
  
  // Create repositories
  const conversationStateRepo = new ConversationStateRepository();
  
  try {
    // PART 1: CHALLENGES FEATURE
    console.log('\n===== PART 1: CHALLENGES FEATURE =====');
    
    // Step 1: Create a new challenge
    console.log('\n1. Creating a new challenge...');
    const challengeId = uuidv4();
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
        title: 'Comprehensive E2E Test Challenge',
        scenario: 'This is a test challenge created for comprehensive E2E testing',
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
      title: 'Comprehensive E2E Test: AI Literacy Challenge',
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
    
    // PART 2: CONVERSATION STATE FEATURE
    console.log('\n===== PART 2: CONVERSATION STATE FEATURE =====');
    
    // Step 1: Create a conversation state
    console.log('\n1. Creating a conversation state...');
    const conversationStateId = uuidv4();
    const conversationState = {
      id: conversationStateId,
      userId: testUserId,
      context: `challenge:${challengeId}`,
      lastResponseId: 'initial-response-123',
      metadata: {
        challenge: {
          id: challengeId,
          title: createdChallenge.title
        }
      }
    };
    
    const createdState = await conversationStateRepo.createState(conversationState);
    console.log('Conversation state created successfully!');
    console.log('State ID:', createdState.id);
    console.log('Context:', createdState.context);
    
    // Step 2: Find state by ID
    console.log('\n2. Finding conversation state by ID...');
    const foundState = await conversationStateRepo.findStateById(conversationStateId);
    console.log('Found state:', foundState);
    
    // Step 3: Find state by context
    console.log('\n3. Finding conversation state by context...');
    const foundStateByContext = await conversationStateRepo.findStateByContext(testUserId, `challenge:${challengeId}`);
    console.log('Found state by context:', foundStateByContext);
    
    // Step 4: Update conversation state
    console.log('\n4. Updating conversation state...');
    const updateResult = await conversationStateRepo.updateState(conversationStateId, {
      lastResponseId: 'updated-response-456',
      metadata: {
        ...conversationState.metadata,
        lastUpdate: new Date().toISOString(),
        progress: 0.5
      }
    });
    console.log('Update result:', updateResult);
    
    // Step 5: Submit a response to the challenge
    console.log('\n5. Submitting a response to the challenge...');
    const response = {
      answer1: 'Key considerations include data privacy, bias mitigation, transparency, and human oversight.',
      answer2: 'To ensure ethical and fair AI systems, we need diverse training data, ongoing monitoring, clear guidelines, and user feedback mechanisms.'
    };
    
    const updateData = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      response: response
    };
    
    const { error: updateError } = await supabaseClient
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId);
      
    if (updateError) {
      throw new Error(`Failed to submit response: ${updateError.message}`);
    }
    
    console.log('Response submitted successfully!');
    
    // Step 6: Update conversation state with challenge submission
    console.log('\n6. Updating conversation state with challenge submission...');
    const submissionUpdate = await conversationStateRepo.updateState(conversationStateId, {
      lastResponseId: 'submission-response-789',
      metadata: {
        ...conversationState.metadata,
        challengeStatus: 'submitted',
        submittedAt: new Date().toISOString()
      }
    });
    console.log('Submission update result:', submissionUpdate);
    
    // Step 7: Evaluate and complete the challenge
    console.log('\n7. Completing the challenge with evaluation...');
    const evaluation = {
      overall_score: 8,
      feedback: 'Great job addressing the key points in AI ethics and implementation!',
      strengths: ['Clear articulation of key concepts', 'Well-organized response'],
      areas_for_improvement: ['Could provide more specific examples', 'Consider regulatory aspects in more detail'],
      metrics: {
        clarity: 8,
        knowledge: 9,
        critical_thinking: 7
      }
    };
    
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
    
    console.log('Challenge completed with evaluation!');
    
    // Step 8: Final update to conversation state with completion
    console.log('\n8. Updating conversation state with challenge completion...');
    const completionStateUpdate = await conversationStateRepo.updateState(conversationStateId, {
      lastResponseId: 'completion-response-999',
      metadata: {
        ...conversationState.metadata,
        challengeStatus: 'completed',
        completedAt: new Date().toISOString(),
        score: evaluation.overall_score
      }
    });
    console.log('Completion state update result:', completionStateUpdate);
    
    // CLEANUP
    console.log('\n===== CLEANUP =====');
    
    // Step 1: Delete conversation state
    console.log('\n1. Deleting conversation state...');
    const deleteStateResult = await conversationStateRepo.deleteState(conversationStateId);
    console.log('Delete state result:', deleteStateResult);
    
    // Step 2: Delete challenge
    console.log('\n2. Deleting challenge...');
    const { error: deleteChallengeError } = await supabaseClient
      .from('challenges')
      .delete()
      .eq('id', challengeId);
      
    if (deleteChallengeError) {
      throw new Error(`Failed to delete challenge: ${deleteChallengeError.message}`);
    }
    
    console.log('Challenge deleted successfully!');
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('E2E Test failed:', error.message);
    console.error(error);
    
    // Attempt cleanup even if test fails
    try {
      console.log('\nAttempting cleanup after error...');
      
      // Check if conversation state was created and delete it
      const stateToDelete = await conversationStateRepo.findStateByContext(testUserId, `challenge:${challengeId}`);
      if (stateToDelete) {
        await conversationStateRepo.deleteState(stateToDelete.id);
        console.log('Deleted conversation state:', stateToDelete.id);
      }
      
      // Check if challenge was created and delete it
      const { data: challengeToDelete } = await supabaseClient
        .from('challenges')
        .select('id')
        .eq('id', challengeId)
        .maybeSingle();
        
      if (challengeToDelete) {
        await supabaseClient.from('challenges').delete().eq('id', challengeId);
        console.log('Deleted challenge:', challengeId);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
  }
}

// Run the test
testComprehensiveE2E(); 