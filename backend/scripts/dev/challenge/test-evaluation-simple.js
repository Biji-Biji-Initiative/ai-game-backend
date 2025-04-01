/**
 * Simplified test script for the Evaluation Domain Model
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { supabaseClient: supabase } = require('../../src/core/infra/db/supabaseClient');

/**
 *
 */
async function runTest() {
  console.log('Starting simple evaluation test...');
  
  try {
    // Get user and challenge IDs
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError) {throw new Error(`User error: ${userError.message}`);}
    if (!userData.length) {throw new Error('No users found');}
    
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id')
      .limit(1);
    
    if (challengeError) {throw new Error(`Challenge error: ${challengeError.message}`);}
    if (!challengeData.length) {throw new Error('No challenges found');}
    
    const userId = userData[0].id;
    const challengeId = challengeData[0].id;
    
    console.log(`Using User ID: ${userId}`);
    console.log(`Using Challenge ID: ${challengeId}`);
    
    // Create a simple evaluation
    const evaluationData = {
      id: uuidv4(),
      user_id: userId,
      challenge_id: challengeId,
      overall_score: 85,
      feedback: 'This is a simple test feedback',
      strengths: ['Good point 1', 'Good point 2'],
      created_at: new Date().toISOString()
    };
    
    console.log('Inserting evaluation directly to database...');
    const { data, error } = await supabase
      .from('evaluations')
      .insert([evaluationData])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Insert error: ${error.message}`);
    }
    
    console.log('Success! Evaluation saved:');
    console.log(JSON.stringify(data, null, 2));
    
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

runTest()
  .then(success => {
    console.log(success ? 'Test completed successfully' : 'Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 