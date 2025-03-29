'use strict';

/**
 * Personality Domain Configuration
 *
 * Contains static domain knowledge specific to the personality domain.
 * Includes definitions of personality traits and AI attitudes measured
 * by the system.
 */

// Personality traits measured in the system
const personalityTraits = [
  {
    id: 'creativity',
    name: 'Creativity',
    description: 'Ability to generate novel and valuable ideas',
  },
  {
    id: 'analyticalThinking',
    name: 'Analytical Thinking',
    description: 'Ability to break down complex problems systematically',
  },
  {
    id: 'empathy',
    name: 'Empathy',
    description: 'Ability to understand and share the feelings of others',
  },
  {
    id: 'assertiveness',
    name: 'Assertiveness',
    description: 'Ability to confidently express opinions and stand up for oneself',
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    description: 'Ability to adjust to new conditions or situations',
  },
];

// AI attitude dimensions measured in the system
const aiAttitudes = [
  {
    id: 'trust',
    name: 'Trust in AI',
    description: 'Willingness to rely on AI systems',
  },
  {
    id: 'jobConcerns',
    name: 'Job Displacement Concerns',
    description: 'Worry about AI impact on employment',
  },
  {
    id: 'impact',
    name: 'Perceived Positive Impact',
    description: 'Belief in AI potential for societal benefit',
  },
  {
    id: 'interest',
    name: 'Interest in AI',
    description: 'Desire to learn more about AI technologies',
  },
  {
    id: 'interaction',
    name: 'AI Interaction Frequency',
    description: 'How often the user engages with AI tools',
  },
];

// Analysis scales used for measuring traits
const traitScales = {
  level: {
    min: 0,
    max: 10,
    defaultValue: 5,
    description: 'Overall level of the trait on a scale from 0 to 10',
  },
  confidence: {
    min: 0,
    max: 1.0,
    defaultValue: 0.5,
    description: 'Confidence in the trait assessment on a scale from 0.0 to 1.0',
  },
};

module.exports = {
  personalityTraits,
  aiAttitudes,
  traitScales,

  // Helper methods for working with traits and attitudes
  findTraitById: id => personalityTraits.find(trait => trait.id === id),
  findAttitudeById: id => aiAttitudes.find(attitude => attitude.id === id),

  // Get a list of just the trait IDs for quick reference
  getTraitIds: () => personalityTraits.map(trait => trait.id),
  getAttitudeIds: () => aiAttitudes.map(attitude => attitude.id),
};
