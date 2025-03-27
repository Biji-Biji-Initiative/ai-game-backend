const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');
const { logger } = require('./core/infra/logging/logger');

const API_URL = 'http://localhost:3000/api';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Store user data across interactions
let userData = null;
let currentChallengeId = null;
let previousResponseId = null;

/**
 * Display the main menu
 */
function displayMainMenu() {
  // Clear terminal using ANSI escape codes instead of console.clear()
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === AI FIGHT CLUB === \n'));
  logger.info(chalk.yellow('Discover your Human Edge in the age of AI\n'));
  
  logger.info(chalk.cyan('1) Start User Onboarding'));
  logger.info(chalk.cyan('2) Generate Challenge'));
  logger.info(chalk.cyan('3) Submit Challenge Response'));
  logger.info(chalk.cyan('4) View User Profile'));
  logger.info(chalk.cyan('5) Exit'));
  
  rl.question(chalk.green('\nEnter your choice (1-5): '), handleMenuChoice);
}

/**
 * Handle the main menu choice
 */
function handleMenuChoice(choice) {
  switch(choice) {
    case '1':
      startUserOnboarding();
      break;
    case '2':
      generateChallenge();
      break;
    case '3':
      submitChallengeResponse();
      break;
    case '4':
      viewUserProfile();
      break;
    case '5':
      logger.info(chalk.yellow('\nThank you for using AI Fight Club!\n'));
      rl.close();
      process.exit(0);
      break;
    default:
      logger.info(chalk.red('\nInvalid choice. Please try again.'));
      setTimeout(displayMainMenu, 1500);
  }
}

/**
 * Start the user onboarding process
 */
function startUserOnboarding() {
  // Clear terminal using ANSI escape codes instead of console.clear()
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === USER ONBOARDING === \n'));
  
  // Collect basic user information
  collectBasicUserInfo();
}

/**
 * Collect basic user information
 */
function collectBasicUserInfo() {
  const userInfo = {};
  
  rl.question(chalk.green('Full Name: '), (fullName) => {
    userInfo.fullName = fullName;
    
    rl.question(chalk.green('Email: '), (email) => {
      userInfo.email = email;
      
      rl.question(chalk.green('Professional Title: '), (professionalTitle) => {
        userInfo.professionalTitle = professionalTitle;
        
        rl.question(chalk.green('Location (City): '), (location) => {
          userInfo.location = location;
          
          rl.question(chalk.green('Country: '), (country) => {
            userInfo.country = country;
            
            logger.info(chalk.cyan('\nNow let\'s assess your personality traits...'));
            collectPersonalityTraits(userInfo);
          });
        });
      });
    });
  });
}

/**
 * Collect personality trait assessments
 */
function collectPersonalityTraits(userInfo) {
  const traits = {};
  
  logger.info(chalk.yellow('\nRate yourself on a scale of 0.0 to 1.0 (e.g., 0.7)'));
  
  rl.question(chalk.green('Creativity: '), (creativity) => {
    traits.creativity = parseFloat(creativity);
    
    rl.question(chalk.green('Analytical Thinking: '), (analyticalThinking) => {
      traits.analyticalThinking = parseFloat(analyticalThinking);
      
      rl.question(chalk.green('Empathy: '), (empathy) => {
        traits.empathy = parseFloat(empathy);
        
        rl.question(chalk.green('Risk-Taking: '), (riskTaking) => {
          traits.riskTaking = parseFloat(riskTaking);
          
          rl.question(chalk.green('Adaptability: '), (adaptability) => {
            traits.adaptability = parseFloat(adaptability);
            
            logger.info(chalk.cyan('\nFinally, let\'s understand your attitudes towards AI...'));
            collectAIAttitudes(userInfo, traits);
          });
        });
      });
    });
  });
}

/**
 * Collect AI attitude assessments
 */
function collectAIAttitudes(userInfo, traits) {
  const attitudes = {};
  
  logger.info(chalk.yellow('\nRate on a scale of 0.0 to 1.0 (e.g., 0.7)'));
  
  rl.question(chalk.green('Trust in AI Technologies: '), (trust) => {
    attitudes.trust = parseFloat(trust);
    
    rl.question(chalk.green('Concern about AI Impact on Jobs: '), (jobConcerns) => {
      attitudes.jobConcerns = parseFloat(jobConcerns);
      
      rl.question(chalk.green('Perceived Positive Impact of AI on Society: '), (impact) => {
        attitudes.impact = parseFloat(impact);
        
        rl.question(chalk.green('Interest in Learning About AI: '), (interest) => {
          attitudes.interest = parseFloat(interest);
          
          rl.question(chalk.green('Frequency of AI Interaction: '), (interaction) => {
            attitudes.interaction = parseFloat(interaction);
            
            submitUserData(userInfo, traits, attitudes);
          });
        });
      });
    });
  });
}

/**
 * Submit user data to the API
 */
async function submitUserData(personalInfo, personalityTraits, aiAttitudes) {
  logger.info(chalk.cyan('\nProcessing your data...'));
  
  try {
    const response = await axios.post(`${API_URL}/users/onboard`, {
      fullName: personalInfo.fullName,
      email: personalInfo.email,
      professionalTitle: personalInfo.professionalTitle,
      location: personalInfo.location,
      country: personalInfo.country,
      personalityTraits,
      aiAttitudes
    });
    
    userData = response.data.data.user;
    logger.info(chalk.green('\nOnboarding successful!'));
    
    if (userData.insights && userData.insights.personalityInsights) {
      logger.info(chalk.yellow('\nHere\'s your personality insight:'));
      logger.info(chalk.cyan(userData.insights.personalityInsights));
      
      logger.info(chalk.yellow('\nRecommended Focus Areas:'));
      userData.insights.suggestedFocusAreas.forEach((area, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${area}: ${userData.insights.focusAreaReasonings[area]}`));
      });
      
      logger.info(chalk.yellow('\nAI Attitude Profile:'));
      logger.info(chalk.cyan(userData.insights.aiAttitudeProfile));
    } else {
      logger.info(chalk.yellow('\nYour current focus area:'));
      logger.info(chalk.cyan(userData.focusArea));
    }
    
    rl.question(chalk.green('\nPress Enter to continue...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError during onboarding:'));
    if (error.response) {
      logger.error(chalk.red(error.response.data.message));
    } else {
      logger.error(chalk.red(error.message));
    }
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * Generate a new challenge
 */
async function generateChallenge() {
  // Clear terminal using ANSI escape codes instead of console.clear()
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === CHALLENGE GENERATOR === \n'));
  
  if (!userData) {
    logger.info(chalk.red('\nYou need to complete onboarding first!'));
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
    return;
  }
  
  logger.info(chalk.yellow('Your current focus area:'), chalk.cyan(userData.insights.focusArea));
  
  rl.question(chalk.green('\nWould you like to use this focus area? (y/n): '), async (answer) => {
    let focusArea = userData.insights.focusArea;
    
    if (answer.toLowerCase() === 'n') {
      rl.question(chalk.green('\nEnter your preferred focus area: '), async (newFocusArea) => {
        focusArea = newFocusArea;
        await requestChallenge(focusArea);
      });
    } else {
      await requestChallenge(focusArea);
    }
  });
}

/**
 * Request a challenge from the API
 */
async function requestChallenge(focusArea) {
  logger.info(chalk.cyan('\nGenerating your challenge...'));
  
  try {
    const response = await axios.post(`${API_URL}/challenges/generate`, {
      focusArea,
      email: userData.email
    });
    
    const challengeData = response.data.data.challenge;
    currentChallengeId = challengeData.id;
    
    logger.info(chalk.green('\nChallenge generated successfully!'));
    logger.info(chalk.yellow('\n=== ' + challengeData.prompt + ' ==='));
    logger.info(chalk.cyan('\nContext:'));
    logger.info(challengeData.context);
    
    logger.info(chalk.cyan('\nQuestions:'));
    challengeData.questions.forEach((question, index) => {
      logger.info(chalk.white(`${index + 1}. ${question.text}`));
    });
    logger.info(chalk.yellow('\n======================================='));
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError generating challenge:'));
    if (error.response) {
      logger.error(chalk.red(error.response.data.message));
    } else {
      logger.error(chalk.red(error.message));
    }
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * Submit a response to the current challenge
 */
function submitChallengeResponse() {
  // Clear terminal using ANSI escape codes instead of console.clear()
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === CHALLENGE RESPONSE === \n'));
  
  if (!currentChallengeId) {
    logger.info(chalk.red('\nYou need to generate a challenge first!'));
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
    return;
  }
  
  logger.info(chalk.yellow('\nEnter your response to the current challenge:'));
  logger.info(chalk.cyan('(Type your response and press Enter, then type "END" on a new line to finish)'));
  
  let response = '';
  const responseInput = () => {
    rl.question('> ', (line) => {
      if (line === 'END') {
        sendChallengeResponse(response);
      } else {
        response += line + '\n';
        responseInput();
      }
    });
  };
  
  responseInput();
}

/**
 * Send the challenge response to the API
 */
async function sendChallengeResponse(responseText) {
  logger.info(chalk.cyan('\nEvaluating your response...'));
  
  try {
    // Format response for API
    const responses = [];
    
    // Get the current challenge data first
    const challengeResponse = await axios.get(`${API_URL}/challenges/${currentChallengeId}`);
    const challenge = challengeResponse.data.data.challenge;
    
    // Create a response for each question
    // For simplicity in terminal client, we'll use the same response for all questions
    challenge.questions.forEach(question => {
      responses.push({
        questionId: question.id,
        answer: responseText
      });
    });

    // Check if the API supports streaming
    const supportsStreaming = true; // Set to true to enable streaming
    
    if (supportsStreaming) {
      // Use streaming API
      logger.info(chalk.cyan('\nProcessing your response...'));
      
      // Set up event source for streaming
      const streamUrl = `${API_URL}/challenges/${currentChallengeId}/submit/stream`;
      
      // Create headers for the request
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      
      // Create the request body
      const requestBody = {
        responses,
        userEmail: userData.email
      };
      
      // Make the streaming request
      const response = await axios.post(streamUrl, requestBody, {
        headers,
        responseType: 'stream'
      });
      
      // Process the stream
      let evaluation = {
        score: 0,
        overallFeedback: '',
        strengths: [],
        areasForImprovement: [],
        nextSteps: ''
      };
      
      // Set up a variable to collect the streamed content
      let streamedContent = '';
      
      // Display a loading animation
      const loadingChars = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
      let loadingIndex = 0;
      const loadingInterval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(loadingChars[loadingIndex])} Analyzing response...`);
        loadingIndex = (loadingIndex + 1) % loadingChars.length;
      }, 100);
      
      // Process the stream data
      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        
        // Check if the chunk is a data event
        if (chunkStr.startsWith('data:')) {
          try {
            // Extract the JSON data
            const jsonStr = chunkStr.replace(/^data: /, '').trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              const data = JSON.parse(jsonStr);
              
              // Update the evaluation with the streamed data
              if (data.type === 'evaluation.score') {
                evaluation.score = data.content;
                process.stdout.write(`\r${chalk.green('Score calculated: ' + evaluation.score + '/100')}\n`);
              } else if (data.type === 'evaluation.feedback') {
                evaluation.overallFeedback += data.content;
                process.stdout.write(`\r${chalk.cyan('Generating feedback...')}\n`);
              } else if (data.type === 'evaluation.strength') {
                evaluation.strengths.push(data.content);
                process.stdout.write(`\r${chalk.green('Identified strength: ' + data.content)}\n`);
              } else if (data.type === 'evaluation.improvement') {
                evaluation.areasForImprovement.push(data.content);
                process.stdout.write(`\r${chalk.yellow('Area for improvement: ' + data.content)}\n`);
              } else if (data.type === 'evaluation.next_steps') {
                evaluation.nextSteps += data.content;
                process.stdout.write(`\r${chalk.cyan('Finalizing evaluation...')}\n`);
              } else if (data.type === 'evaluation.complete') {
                // Evaluation is complete
                process.stdout.write(`\r${chalk.green('Evaluation complete!')}\n`);
              }
              
              // Add to the streamed content
              streamedContent += data.content || '';
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      });
      
      // Handle stream end
      await new Promise((resolve, reject) => {
        response.data.on('end', () => {
          clearInterval(loadingInterval);
          resolve();
        });
        
        response.data.on('error', (err) => {
          clearInterval(loadingInterval);
          reject(err);
        });
      });
      
      // Display the final evaluation
      logger.info(chalk.yellow('\n======================================='));
      logger.info(chalk.cyan('Overall Score: ' + evaluation.score + '/100'));
      logger.info(chalk.green('\nFeedback:'));
      logger.info(chalk.white(evaluation.overallFeedback));
      
      logger.info(chalk.green('\nStrengths:'));
      evaluation.strengths.forEach((strength, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${strength}`));
      });
      
      logger.info(chalk.yellow('\nAreas for Improvement:'));
      evaluation.areasForImprovement.forEach((area, index) => {
        logger.info(chalk.white(`${index + 1}. ${area}`));
      });
      
      logger.info(chalk.yellow('\nNext Steps:'));
      logger.info(chalk.white(evaluation.nextSteps));
      logger.info(chalk.yellow('=======================================\n'));
    } else {
      // Use non-streaming API (fallback)
      const apiResponse = await axios.post(`${API_URL}/challenges/${currentChallengeId}/submit`, {
        responses,
        userEmail: userData.email
      });
      
      const evaluation = apiResponse.data.data.evaluation;
      
      logger.info(chalk.green('\nEvaluation complete!'));
      logger.info(chalk.yellow('\n======================================='));
      logger.info(chalk.cyan('Overall Score: ' + evaluation.score + '/100'));
      logger.info(chalk.green('\nFeedback:'));
      logger.info(chalk.white(evaluation.overallFeedback));
      
      logger.info(chalk.green('\nStrengths:'));
      evaluation.strengths.forEach((strength, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${strength}`));
      });
      
      logger.info(chalk.yellow('\nAreas for Improvement:'));
      evaluation.areasForImprovement.forEach((area, index) => {
        logger.info(chalk.white(`${index + 1}. ${area}`));
      });
      
      logger.info(chalk.yellow('\nNext Steps:'));
      logger.info(chalk.white(evaluation.nextSteps));
      logger.info(chalk.yellow('=======================================\n'));
    }
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError submitting response:'));
    if (error.response) {
      logger.error(chalk.red(error.response.data.message));
    } else {
      logger.error(chalk.red(error.message));
    }
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * View the current user profile
 */
/**
 * View the current user profile
 */
async function viewUserProfile() {
  // Clear terminal using ANSI escape codes instead of console.clear()
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === USER PROFILE === \n'));
  
  if (!userData) {
    logger.info(chalk.red('\nYou need to complete onboarding first!'));
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
    return;
  }
  
  try {
    // Get the latest user data
    const response = await axios.get(`${API_URL}/users/${userData.email}`);
    const user = response.data.data.user;
    userData = user; // Update our cached user data
    
    logger.info(chalk.yellow('Personal Information:'));
    logger.info(chalk.cyan(`Name: ${user.fullName}`));
    logger.info(chalk.cyan(`Email: ${user.email}`));
    logger.info(chalk.cyan(`Title: ${user.professionalTitle || 'Not specified'}`));
    logger.info(chalk.cyan(`Location: ${user.location || 'Not specified'}${user.country ? `, ${user.country}` : ''}`));
    
    if (user.personalityTraits) {
      logger.info(chalk.yellow('\nPersonality Traits:'));
      for (const [trait, score] of Object.entries(user.personalityTraits)) {
        logger.info(chalk.cyan(`${trait}: ${score}`));
      }
    }
    
    if (user.aiAttitudes) {
      logger.info(chalk.yellow('\nAI Attitudes:'));
      for (const [attitude, score] of Object.entries(user.aiAttitudes)) {
        logger.info(chalk.cyan(`${attitude}: ${score}`));
      }
    }
    
    if (user.insights) {
      logger.info(chalk.yellow('\nPersonality Insight:'));
      logger.info(chalk.cyan(user.insights.personalityInsights || 'No insights available yet'));
      
      if (user.insights.suggestedFocusAreas && user.insights.suggestedFocusAreas.length > 0) {
        logger.info(chalk.yellow('\nRecommended Focus Areas:'));
        user.insights.suggestedFocusAreas.forEach((area, index) => {
          logger.info(chalk.cyan(`${index + 1}. ${area}: ${user.insights.focusAreaReasonings?.[area] || ''}`));
        });
      }
    }
    
    // Get challenge history
    const historyResponse = await axios.get(`${API_URL}/challenges/user/${user.email}/history`);
    const history = historyResponse.data.data.challenges;
    
    if (history && history.length > 0) {
      logger.info(chalk.yellow('\nRecent Challenge History:'));
      history.slice(0, 5).forEach((challenge, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${challenge.prompt} (${new Date(challenge.createdAt).toLocaleDateString()})`));
        logger.info(chalk.white(`   Score: ${challenge.evaluation?.score || 'Not yet completed'}/100`));
      });
    } else {
      logger.info(chalk.yellow('\nNo challenge history yet.'));
    }
  
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError retrieving profile:'));
    if (error.response) {
      logger.error(chalk.red(error.response.data.message));
    } else {
      logger.error(chalk.red(error.message));
    }
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }

// Start the application
// Clear terminal using ANSI escape codes instead of console.clear()
process.stdout.write('\x1Bc');
logger.info(chalk.bgBlue.white('\n === WELCOME TO AI FIGHT CLUB === \n'));
logger.info(chalk.yellow('Discover your Human Edge in the age of AI\n'));

logger.info(chalk.cyan('This terminal-based client allows you to interact with the AI Fight Club API.'));
logger.info(chalk.cyan('You\'ll be guided through:'));
logger.info(chalk.cyan('1. The onboarding process to collect your information'));
logger.info(chalk.cyan('2. Challenge generation based on your profile'));
logger.info(chalk.cyan('3. Challenge response submission and evaluation\n'));

rl.question(chalk.green('Press Enter to continue...'), () => {
  displayMainMenu();
});
}
