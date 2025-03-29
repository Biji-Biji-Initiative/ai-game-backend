/**
 * Simple Test for Evaluation Generation
 * This test shows how evaluations are built dynamically using OpenAI
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { supabaseClient: supabase } = require('../../src/core/infra/db/supabaseClient');
const Evaluation = require('./src/core/evaluation/models/Evaluation');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 *
 */
async function runTest() {
  console.log('Starting simple evaluation generation test...');
  
  try {
    // Get user and challenge data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (userError) {throw new Error(`User error: ${userError.message}`);}
    if (!userData.length) {throw new Error('No users found');}
    
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, content, challenge_type, format_type')
      .limit(1);
    
    if (challengeError) {throw new Error(`Challenge error: ${challengeError.message}`);}
    if (!challengeData.length) {throw new Error('No challenges found');}
    
    const user = userData[0];
    const challenge = challengeData[0];
    
    console.log(`Using User ID: ${user.id}`);
    console.log(`Using Challenge: ${challenge.title}`);
    
    // Create a sample user response
    const userResponse = 'I believe AI systems should be developed with strong ethical guidelines. First, transparency is crucial so users understand how AI makes decisions. Second, privacy must be respected, with data collection minimized and properly secured. Third, bias must be actively detected and mitigated. Finally, AI should ultimately enhance human autonomy rather than diminish it. Companies developing AI need robust governance frameworks and should involve diverse perspectives throughout the development process.';
    
    console.log('User response excerpt:', userResponse.substring(0, 100) + '...');
    
    // Create a thread ID for tracking the conversation
    const threadId = `resp_${user.id}_evaluation_${Date.now()}`;
    console.log(`Thread ID: ${threadId}`);
    
    // Build a simple evaluation prompt
    const prompt = `
EVALUATION TASK
Please evaluate this user's response to a challenge about AI ethics.

CHALLENGE DETAILS
Title: ${challenge.title}
Type: ${challenge.challenge_type}
Format: ${challenge.format_type}

CHALLENGE CONTENT
${typeof challenge.content === 'string' ? challenge.content : JSON.stringify(challenge.content)}

USER RESPONSE
${userResponse}

Please provide your evaluation as a JSON object with the following structure:
{
  "score": 85, // 0-100 score
  "overallFeedback": "Overall feedback about the response",
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "areasForImprovement": [
    "Area 1",
    "Area 2"
  ],
  "nextSteps": "Recommendations for next steps"
}
`;

    console.log('Generating evaluation using OpenAI...');
    
    // Create the system message
    const systemMessage = `You are an AI evaluation expert specializing in providing fair and constructive feedback. 
Always return your evaluation as a JSON object with scoring, feedback, strengths, and improvement suggestions.
Format your response as valid, parsable JSON.`;
    
    // Call OpenAI for the evaluation
    const response = await openai.responses.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });
    
    // Extract and parse the evaluation
    const evaluationText = response.choices[0].message.content;
    const evaluationData = JSON.parse(evaluationText);
    
    console.log('Received evaluation from OpenAI:');
    console.log(`Score: ${evaluationData.score}`);
    console.log(`Overall Feedback: ${evaluationData.overallFeedback.substring(0, 150)}...`);
    console.log('Strengths:');
    evaluationData.strengths.forEach((strength, i) => {
      console.log(`  ${i+1}. ${strength}`);
    });
    
    // Create the evaluation domain model
    const evaluation = new Evaluation({
      userId: user.id,
      challengeId: challenge.id,
      score: evaluationData.score,
      overallFeedback: evaluationData.overallFeedback,
      strengths: evaluationData.strengths,
      areasForImprovement: evaluationData.areasForImprovement,
      nextSteps: evaluationData.nextSteps,
      threadId: threadId,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o'
      }
    });
    
    console.log('\nCreated Evaluation domain model:');
    console.log(`ID: ${evaluation.id}`);
    console.log(`Score: ${evaluation.score}`);
    console.log(`Performance Level: ${evaluation.getPerformanceLevel()}`);
    
    // Save to database
    console.log('\nSaving evaluation to database...');
    const evaluationData2 = {
      id: evaluation.id,
      user_id: evaluation.userId,
      challenge_id: evaluation.challengeId,
      overall_score: evaluation.score,
      feedback: evaluation.overallFeedback,
      strengths: evaluation.strengths,
      areas_for_improvement: evaluation.areasForImprovement,
      next_steps: evaluation.nextSteps,
      thread_id: evaluation.threadId,
      metadata: evaluation.metadata,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('evaluations')
      .insert([evaluationData2])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }
    
    console.log('Successfully saved evaluation to database!');
    console.log(`DB ID: ${data.id}`);
    
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