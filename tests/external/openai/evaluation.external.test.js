/**
 * External Test: OpenAI Integration for Evaluations
 * 
 * Tests the direct integration with the OpenAI API for generating 
 * evaluations of challenge responses.
 */

const { expect } = require('chai');
const { OpenAIClient } = require('../../src/infra/openai');

const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
require('dotenv').config();

describe('External: OpenAI Evaluation Integration', function() {
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
  });

  // Configure longer timeout for external API calls
  this.timeout(30000);
  
  let openaiClient;
  
  before(function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping external tests');
      this.skip();
    }
    
    // Initialize OpenAI client
    openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
    });
  });
  
  it('should generate evaluation of challenge response using OpenAI', async function() {
    // Create the evaluation prompt
    const challenge = {
      title: 'Logic Puzzle Challenge',
      content: {
        description: 'Solve the grid puzzle with 5 people and their drinks.'
      }
    };
    
    const userResponse = `First, I start by setting up a grid with 5 positions and noting what we know:
    1. Alice's cup contains water.
    2. Bob is sitting in the middle.
    3. The person drinking coffee is sitting at one of the ends.
    
    From clue 4, Charlie is sitting next to the person drinking tea. And from clue 5, Dana is sitting next to Elliot.
    
    Since Bob is in the middle (position 3), other people must be in positions 1, 2, 4, and 5.
    
    From clue 6, the person drinking orange juice is sitting next to the person drinking milk. 
    
    From clue 7, the person drinking soda is not sitting at either end, so they must be in position 2 or 4.
    
    The final arrangement:
    Position 1: Alice (water)
    Position 2: Charlie (soda)
    Position 3: Bob (tea)
    Position 4: Elliot (orange juice)
    Position 5: Dana (coffee)`;
    
    const promptText = `Evaluate the following response to a critical thinking challenge.
    
    Challenge: ${challenge.title}
    ${challenge.content.description}
    
    User's Response:
    ${userResponse}
    
    Evaluate this solution and provide an assessment in JSON format with the following structure:
    {
      "overall_score": 8, // number from 1-10
      "feedback": "Detailed overall feedback",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
      "category_scores": {
        "clarity": 7,
        "reasoning": 8,
        "originality": 6
      }
    }`;
    
    // Call OpenAI API
    const completion = await openaiClient.responses.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an evaluator for critical thinking challenges. Provide an assessment of the user\'s solution with constructive feedback.'
        },
        {
          role: 'user',
          content: promptText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Verify the OpenAI response
    expect(completion).to.exist;
    expect(completion.choices).to.be.an('array').with.lengthOf.at.least(1);
    expect(completion.choices[0].message).to.exist;
    expect(completion.choices[0].message.content).to.be.a('string');
    
    // Parse and verify the content
    const evaluationData = JSON.parse(completion.choices[0].message.content);
    expect(evaluationData).to.be.an('object');
    expect(evaluationData.overall_score).to.be.a('number').within(1, 10);
    expect(evaluationData.feedback).to.be.a('string').and.not.empty;
    expect(evaluationData.strengths).to.be.an('array').with.lengthOf.at.least(1);
    expect(evaluationData.areas_for_improvement).to.be.an('array');
    expect(evaluationData.category_scores).to.be.an('object');
    expect(evaluationData.category_scores.clarity).to.be.a('number').within(1, 10);
    expect(evaluationData.category_scores.reasoning).to.be.a('number').within(1, 10);
    expect(evaluationData.category_scores.originality).to.be.a('number').within(1, 10);
    
    console.log('Evaluation Score:', evaluationData.overall_score);
    console.log('Strengths:', evaluationData.strengths.join(', '));
  });
  
  it('should evaluate different quality responses appropriately', async function() {
    // Create the evaluation prompt with a poor quality response
    const challenge = {
      title: 'AI Ethics Challenge',
      content: {
        description: 'Discuss the ethical implications of using AI for hiring decisions.'
      }
    };
    
    const poorResponse = 'AI in hiring is good but can be bad too.';
    
    const promptText = `Evaluate the following response to a critical thinking challenge.
    
    Challenge: ${challenge.title}
    ${challenge.content.description}
    
    User's Response:
    ${poorResponse}
    
    Evaluate this solution and provide an assessment in JSON format with the following structure:
    {
      "overall_score": 8, // number from 1-10
      "feedback": "Detailed overall feedback",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
      "category_scores": {
        "clarity": 7,
        "reasoning": 8,
        "originality": 6
      }
    }`;
    
    // Call OpenAI API
    const completion = await openaiClient.responses.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an evaluator for critical thinking challenges. Provide an assessment of the user\'s solution with constructive feedback.'
        },
        {
          role: 'user',
          content: promptText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const evaluationData = JSON.parse(completion.choices[0].message.content);
    
    // Verify the response reflects the poor quality
    expect(evaluationData.overall_score).to.be.below(5);
    expect(evaluationData.feedback).to.include('lack');
    expect(evaluationData.areas_for_improvement.length).to.be.at.least(2);
    
    console.log('Poor Response Score:', evaluationData.overall_score);
    console.log('Areas for Improvement:', evaluationData.areas_for_improvement.join(', '));
  });
}); 