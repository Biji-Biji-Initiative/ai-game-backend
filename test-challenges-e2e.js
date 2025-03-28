require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { supabaseClient } = require('./src/core/infra/db/supabaseClient');

/**
 * End-to-End test for Challenges feature in AI Game
 */
async function testChallengesE2E() {
  console.log('Starting Challenges E2E Test...');
  
  // Test user email - using an existing user from the database
  const testUserEmail = 'permanent-test-user@example.com';
  
  try {
    // Step 1: Create a new challenge
    console.log('\n1. Creating a new challenge...');
    const newChallenge = {
      id: uuidv4(),
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
        title: 'E2E Test Challenge',
        scenario: 'This is a test challenge created for E2E testing',
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
      .eq('id', createdChallenge.id);
      
    if (updateError) {
      throw new Error(`Failed to submit response: ${updateError.message}`);
    }
    
    console.log('Response submitted successfully!');
    
    // Step 4: Complete the challenge with evaluation
    console.log('\n4. Completing the challenge with evaluation...');
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
      .eq('id', createdChallenge.id);
      
    if (completionError) {
      throw new Error(`Failed to complete challenge: ${completionError.message}`);
    }
    
    console.log('Challenge completed with evaluation!');
    
    // Step 5: Retrieve completed challenge with all data
    console.log('\n5. Retrieving completed challenge with all data...');
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
    
    // Step 6: Clean up - Delete the test challenge
    console.log('\n6. Cleaning up - Deleting test challenge...');
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
  }
}

// Run the test
testChallengesE2E(); 