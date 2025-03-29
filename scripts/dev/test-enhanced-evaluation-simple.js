/**
 * Simple Enhanced Evaluation Test
 * Demonstrates category scoring and detailed strength analysis
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const Evaluation = require('./src/core/evaluation/models/Evaluation');
const supabase = require('../../src/core/infra/db/supabaseClient').supabaseClient;
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 *
 */
async function runTest() {
  console.log('Starting enhanced evaluation test...');
  
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
      .select('id, title, content, challenge_type, format_type, focus_area')
      .limit(1);
    
    if (challengeError) {throw new Error(`Challenge error: ${challengeError.message}`);}
    if (!challengeData.length) {throw new Error('No challenges found');}
    
    const user = userData[0];
    const challenge = challengeData[0];
    
    console.log(`Using User ID: ${user.id}`);
    console.log(`Using Challenge: ${challenge.title}`);
    console.log(`Challenge Type: ${challenge.challenge_type}`);
    console.log(`Focus Area: ${challenge.focus_area || 'AI Ethics'}`);
    
    // Create a sample user response about AI ethics
    const userResponse = `AI development must be guided by strong ethical principles to ensure these systems benefit humanity rather than cause harm. First, transparency is essential - users should understand how AI systems make decisions affecting them. Second, privacy protections must be robust, with data minimization practices and proper security measures in place. Third, fairness and bias mitigation are critical - AI systems must be carefully designed and tested to avoid perpetuating or amplifying societal biases. Fourth, AI should enhance human autonomy rather than diminish it, keeping humans "in the loop" for important decisions. Finally, developers must consider the broader societal and environmental impacts of their systems. Implementation of these principles requires diverse teams, regular ethical audits, clear governance frameworks, and ongoing stakeholder engagement.`;
    
    console.log('User response excerpt:', userResponse.substring(0, 100) + '...');
    
    // Create a thread ID for tracking the conversation
    const threadId = `resp_${user.id}_evaluation_${Date.now()}`;
    console.log(`Thread ID: ${threadId}`);
    
    // Build the enhanced evaluation prompt with category scoring
    const prompt = `
EVALUATION TASK
Please evaluate this user's response to a challenge about AI ethics using category-based scoring and detailed strength analysis.

CHALLENGE DETAILS
Title: ${challenge.title}
Type: ${challenge.challenge_type}
Format: ${challenge.format_type}
Focus Area: ${challenge.focus_area || 'AI Ethics'}

CHALLENGE CONTENT
${typeof challenge.content === 'string' ? challenge.content : JSON.stringify(challenge.content)}

USER RESPONSE
${userResponse}

EVALUATION CRITERIA
Evaluate the response using the following criteria:

- ethical_reasoning (0-40 points): Evaluate depth and nuance of ethical analysis and reasoning
- comprehensiveness (0-25 points): Assess coverage of relevant ethical dimensions and perspectives
- clarity (0-20 points): Evaluate how well-organized and clearly expressed the response is
- practical_application (0-15 points): Judge how well ethical principles are applied to concrete situations

The total maximum score is 100 points.

STRENGTH ANALYSIS
For each strength identified, provide a detailed analysis including:
1. What the user did well (the strength itself)
2. Why this aspect is effective or important
3. How it specifically contributes to the quality of the response

RESPONSE FORMAT
Provide your evaluation as a JSON object with the following structure:

{
  "categoryScores": {
    "ethical_reasoning": 30,
    "comprehensiveness": 20,
    "clarity": 18,
    "practical_application": 12
  },
  "overallScore": 80,
  "overallFeedback": "Comprehensive evaluation of the entire response...",
  "strengths": [
    "Clear ethical framework",
    "Considers multiple perspectives",
    "Addresses implementation concerns"
  ],
  "strengthAnalysis": [
    {
      "strength": "Clear ethical framework",
      "analysis": "The response establishes a comprehensive set of ethical principles that address key concerns in AI development.",
      "impact": "This framework provides a solid foundation for evaluating and developing AI systems ethically."
    },
    {
      "strength": "Considers multiple perspectives",
      "analysis": "The response acknowledges various stakeholders' interests, including users, developers, and society at large.",
      "impact": "This multi-faceted approach ensures that ethical considerations are balanced and thorough."
    }
  ],
  "areasForImprovement": [
    "Could provide more specific examples",
    "Minimal discussion of cross-cultural ethical perspectives"
  ],
  "nextSteps": "Recommendations for how the user could further develop their understanding..."
}
`;

    console.log('Generating enhanced evaluation using OpenAI...');
    
    // Create the system message
    const systemMessage = `You are an AI evaluation expert specializing in providing fair, detailed, and structured evaluations.
Always return your evaluation as a JSON object with category scores, overall score, detailed feedback, strengths with analysis, and improvement suggestions.
Format your response as valid, parsable JSON with no markdown formatting.`;
    
    // Call OpenAI for the evaluation
    const response = await openai.chat.completions.create({
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
    
    console.log('\n===== EVALUATION RESULTS =====');
    console.log(`Overall Score: ${evaluationData.overallScore}`);
    
    console.log('\nCategory Scores:');
    Object.entries(evaluationData.categoryScores).forEach(([category, score]) => {
      console.log(`- ${category}: ${score}`);
    });
    
    console.log('\nStrengths:');
    evaluationData.strengths.forEach((strength, i) => {
      console.log(`${i+1}. ${strength}`);
    });
    
    console.log('\nDetailed Strength Analysis:');
    evaluationData.strengthAnalysis.forEach((analysis, i) => {
      console.log(`\nStrength: ${analysis.strength}`);
      console.log(`Analysis: ${analysis.analysis}`);
      console.log(`Impact: ${analysis.impact}`);
    });
    
    console.log('\nAreas for Improvement:');
    evaluationData.areasForImprovement.forEach((area, i) => {
      console.log(`${i+1}. ${area}`);
    });
    
    // Create the evaluation domain model
    const evaluation = new Evaluation({
      userId: user.id,
      challengeId: challenge.id,
      score: evaluationData.overallScore,
      categoryScores: evaluationData.categoryScores,
      overallFeedback: evaluationData.overallFeedback,
      strengths: evaluationData.strengths,
      strengthAnalysis: evaluationData.strengthAnalysis,
      areasForImprovement: evaluationData.areasForImprovement,
      nextSteps: evaluationData.nextSteps,
      threadId: threadId,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o',
        focusArea: challenge.focus_area || 'AI Ethics',
        categoryWeights: {
          ethical_reasoning: 40,
          comprehensiveness: 25,
          clarity: 20,
          practical_application: 15
        }
      }
    });
    
    console.log('\nCreated Enhanced Evaluation domain model:');
    console.log(`ID: ${evaluation.id}`);
    console.log(`Score: ${evaluation.score}`);
    console.log(`Performance Level: ${evaluation.getPerformanceLevel()}`);
    
    // Calculate weighted score based on category weights
    const weightedScore = evaluation.getWeightedScore();
    console.log(`Weighted Score: ${weightedScore}`);
    
    // Demonstrate domain model capabilities
    console.log('\nDomain Model Capabilities Demo:');
    console.log(`Ethical Reasoning Performance Level: ${evaluation.getCategoryPerformanceLevel('ethical_reasoning')}`);
    
    const firstStrength = evaluation.strengths[0];
    const strengthAnalysis = evaluation.getStrengthAnalysis(firstStrength);
    console.log(`\nAnalysis for "${firstStrength}":`);
    if (strengthAnalysis) {
      console.log(`- Analysis: ${strengthAnalysis.analysis.substring(0, 100)}...`);
      console.log(`- Impact: ${strengthAnalysis.impact.substring(0, 100)}...`);
    }
    
    // Save to database
    console.log('\nSaving evaluation to database...');
    const evaluationData2 = {
      id: evaluation.id,
      user_id: evaluation.userId,
      challenge_id: evaluation.challengeId,
      overall_score: evaluation.score,
      category_scores: evaluation.categoryScores,
      feedback: evaluation.overallFeedback,
      overall_feedback: evaluation.overallFeedback,
      strengths: evaluation.strengths,
      strength_analysis: evaluation.strengthAnalysis,
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
    
    console.log('Successfully saved enhanced evaluation to database!');
    console.log(`DB ID: ${data.id}`);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

runTest()
  .then(success => {
    console.log(success ? '\nTest completed successfully ✅' : '\nTest failed ❌');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 