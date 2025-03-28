/**
 * CLI entry point for Responses API Fight Club
 * Uses the application coordinators and domain services
 */

const container = require('../config/container');
const readline = require('readline');
const chalk = require('chalk');
const { logger } = require('../core/infra/logging/logger');

// Initialize services
const userService = container.get('userService');
const personalityService = container.get('personalityService');
const challengeService = container.get('challengeService');
const challengeCoordinator = container.get('challengeCoordinator');
const userJourneyCoordinator = container.get('userJourneyCoordinator');
const personalityCoordinator = container.get('personalityCoordinator');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Store user data across interactions
let currentUser = null;
let currentChallengeId = null;

/**
 * Display the main menu
 */
function displayMainMenu() {
  // Clear terminal using ANSI escape codes
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
  // Clear terminal using ANSI escape codes
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
 * Submit user data using proper application services
 */
async function submitUserData(personalInfo, personalityTraits, aiAttitudes) {
  logger.info(chalk.cyan('\nProcessing your data...'));
  
  try {
    // Create user using UserService
    const user = await userService.createUser({
      fullName: personalInfo.fullName,
      email: personalInfo.email,
      professionalTitle: personalInfo.professionalTitle,
      location: personalInfo.location,
      country: personalInfo.country
    });
    
    // Save personality traits using PersonalityService
    await personalityService.createProfile(user.id, {
      personalityTraits,
      aiAttitudes
    });
    
    // Synchronize AI preferences using PersonalityCoordinator
    await personalityCoordinator.synchronizeUserPreferences(user.id, aiAttitudes);
    
    // Retrieve updated user
    currentUser = await userService.getUserById(user.id);
    
    logger.info(chalk.green('\nOnboarding successful!'));
    
    logger.info(chalk.yellow('\nYour AI Preference Profile:'));
    if (currentUser.preferences && currentUser.preferences.aiInteraction) {
      Object.entries(currentUser.preferences.aiInteraction).forEach(([key, value]) => {
        logger.info(chalk.cyan(`${key}: ${value}`));
      });
    }
    
    rl.question(chalk.green('\nPress Enter to continue...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError during onboarding:'), error);
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * Generate a new challenge using ChallengeCoordinator
 */
async function generateChallenge() {
  // Clear terminal using ANSI escape codes
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === CHALLENGE GENERATOR === \n'));
  
  if (!currentUser) {
    logger.info(chalk.red('\nYou need to complete onboarding first!'));
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
    return;
  }
  
  const currentFocusArea = currentUser.focusArea || 'AI Ethics';
  logger.info(chalk.yellow('Your current focus area:'), chalk.cyan(currentFocusArea));
  
  rl.question(chalk.green('\nWould you like to use this focus area? (y/n): '), async (answer) => {
    let focusArea = currentFocusArea;
    
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
 * Request a challenge using ChallengeCoordinator
 */
async function requestChallenge(focusArea) {
  logger.info(chalk.cyan('\nGenerating your challenge...'));
  
  try {
    // Generate challenge using ChallengeCoordinator
    const challenge = await challengeCoordinator.generateAndPersistChallenge({
      userEmail: currentUser.email,
      focusArea: focusArea,
      challengeType: 'critical-analysis',
      formatType: 'scenario',
      difficulty: 'medium'
    });
    
    currentChallengeId = challenge.id;
    
    logger.info(chalk.green('\nChallenge generated successfully!'));
    logger.info(chalk.yellow('\n=== ' + challenge.title + ' ==='));
    logger.info(chalk.cyan('\nContent:'));
    logger.info(challenge.content);
    
    if (challenge.questions && challenge.questions.length > 0) {
      logger.info(chalk.cyan('\nQuestions:'));
      challenge.questions.forEach((question, index) => {
        logger.info(chalk.white(`${index + 1}. ${question.text || question}`));
      });
    }
    
    logger.info(chalk.yellow('\n======================================='));
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError generating challenge:'), error);
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * Submit a response to the current challenge
 */
function submitChallengeResponse() {
  // Clear terminal using ANSI escape codes
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
 * Send the challenge response using ChallengeCoordinator
 */
async function sendChallengeResponse(responseText) {
  logger.info(chalk.cyan('\nEvaluating your response...'));
  
  try {
    // Submit response using ChallengeCoordinator
    const result = await challengeCoordinator.submitChallengeResponse({
      challengeId: currentChallengeId,
      userEmail: currentUser.email,
      response: responseText
    });
    
    const { evaluation } = result;
    
    logger.info(chalk.green('\nEvaluation complete!'));
    logger.info(chalk.yellow('\n======================================='));
    logger.info(chalk.cyan('Overall Score: ' + evaluation.score + '/100'));
    
    if (evaluation.overallFeedback) {
      logger.info(chalk.green('\nFeedback:'));
      logger.info(chalk.white(evaluation.overallFeedback));
    }
    
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      logger.info(chalk.green('\nStrengths:'));
      evaluation.strengths.forEach((strength, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${strength}`));
      });
    }
    
    if (evaluation.areasForImprovement && evaluation.areasForImprovement.length > 0) {
      logger.info(chalk.yellow('\nAreas for Improvement:'));
      evaluation.areasForImprovement.forEach((area, index) => {
        logger.info(chalk.white(`${index + 1}. ${area}`));
      });
    }
    
    if (evaluation.nextSteps) {
      logger.info(chalk.yellow('\nNext Steps:'));
      logger.info(chalk.white(evaluation.nextSteps));
    }
    
    logger.info(chalk.yellow('=======================================\n'));
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError submitting response:'), error);
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

/**
 * View the current user profile
 */
async function viewUserProfile() {
  // Clear terminal using ANSI escape codes
  process.stdout.write('\x1Bc');
  logger.info(chalk.bgBlue.white('\n === USER PROFILE === \n'));
  
  if (!currentUser) {
    logger.info(chalk.red('\nYou need to complete onboarding first!'));
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
    return;
  }
  
  try {
    // Refresh user data
    currentUser = await userService.getUserById(currentUser.id);
    
    logger.info(chalk.yellow('Personal Information:'));
    logger.info(chalk.cyan(`Name: ${currentUser.fullName}`));
    logger.info(chalk.cyan(`Email: ${currentUser.email}`));
    logger.info(chalk.cyan(`Title: ${currentUser.professionalTitle || 'Not specified'}`));
    logger.info(chalk.cyan(`Location: ${currentUser.location || 'Not specified'}${currentUser.country ? `, ${currentUser.country}` : ''}`));
    
    // Get personality profile
    const personalityProfile = await personalityService.getProfileByUserId(currentUser.id);
    
    if (personalityProfile && personalityProfile.personalityTraits) {
      logger.info(chalk.yellow('\nPersonality Traits:'));
      Object.entries(personalityProfile.personalityTraits).forEach(([trait, score]) => {
        logger.info(chalk.cyan(`${trait}: ${score}`));
      });
    }
    
    if (personalityProfile && personalityProfile.aiAttitudes) {
      logger.info(chalk.yellow('\nAI Attitudes:'));
      Object.entries(personalityProfile.aiAttitudes).forEach(([attitude, score]) => {
        logger.info(chalk.cyan(`${attitude}: ${score}`));
      });
    }
    
    // Get AI preferences
    if (currentUser.preferences && currentUser.preferences.aiInteraction) {
      logger.info(chalk.yellow('\nAI Interaction Preferences:'));
      Object.entries(currentUser.preferences.aiInteraction).forEach(([pref, value]) => {
        logger.info(chalk.cyan(`${pref}: ${value}`));
      });
    }
    
    // Get challenge history
    const challenges = await challengeService.getChallengesForUser(currentUser.email);
    
    if (challenges && challenges.length > 0) {
      logger.info(chalk.yellow('\nRecent Challenge History:'));
      challenges.slice(0, 5).forEach((challenge, index) => {
        logger.info(chalk.cyan(`${index + 1}. ${challenge.title || challenge.prompt} (${new Date(challenge.createdAt).toLocaleDateString()})`));
        logger.info(chalk.white(`   Score: ${challenge.evaluation?.score || challenge.score || 'Not completed'}/100`));
      });
    } else {
      logger.info(chalk.yellow('\nNo challenge history yet.'));
    }
  
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  } catch (error) {
    logger.error(chalk.red('\nError retrieving profile:'), error);
    
    rl.question(chalk.green('\nPress Enter to return to main menu...'), () => {
      displayMainMenu();
    });
  }
}

// Start the application
logger.info(chalk.bgBlue.white('\n === WELCOME TO AI FIGHT CLUB === \n'));
logger.info(chalk.yellow('Discover your Human Edge in the age of AI\n'));

logger.info(chalk.cyan('This CLI allows you to interact with the AI Fight Club application.'));
logger.info(chalk.cyan('You\'ll be guided through:'));
logger.info(chalk.cyan('1. The onboarding process to collect your information'));
logger.info(chalk.cyan('2. Challenge generation based on your profile'));
logger.info(chalk.cyan('3. Challenge response submission and evaluation\n'));

rl.question(chalk.green('Press Enter to continue...'), () => {
  displayMainMenu();
});

module.exports = {
  // Export functions for testing
  displayMainMenu,
  handleMenuChoice,
  submitUserData,
  requestChallenge,
  sendChallengeResponse
}; 