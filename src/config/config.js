/**
 * Application configuration
 */
module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  },
  
  // OpenAI API configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o'
  },
  
  // Moved focusAreas and challengeTypes to config.game to avoid duplication
  
  // Personality traits measured
  personalityTraits: [
    {
      id: "creativity",
      name: "Creativity",
      description: "Ability to generate novel and valuable ideas"
    },
    {
      id: "analyticalThinking",
      name: "Analytical Thinking",
      description: "Ability to break down complex problems systematically"
    },
    {
      id: "empathy",
      name: "Empathy",
      description: "Ability to understand and share the feelings of others"
    },
    {
      id: "assertiveness",
      name: "Assertiveness",
      description: "Ability to confidently express opinions and stand up for oneself"
    },
    {
      id: "adaptability",
      name: "Adaptability",
      description: "Ability to adjust to new conditions or situations"
    }
  ],
  
  // AI attitude dimensions
  aiAttitudes: [
    {
      id: "trust",
      name: "Trust in AI",
      description: "Willingness to rely on AI systems"
    },
    {
      id: "jobConcerns",
      name: "Job Displacement Concerns",
      description: "Worry about AI's impact on employment"
    },
    {
      id: "impact",
      name: "Perceived Positive Impact",
      description: "Belief in AI's potential for societal benefit"
    },
    {
      id: "interest",
      name: "Interest in AI",
      description: "Desire to learn more about AI technologies"
    },
    {
      id: "interaction",
      name: "AI Interaction Frequency",
      description: "How often the user engages with AI tools"
    }
  ],
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePaths: {
      error: 'error.log',
      combined: 'combined.log'
    }
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    tables: {
      users: 'users',
      challenges: 'challenges',
      responses: 'responses',
      insights: 'insights'
    }
  },
  
  // Game configuration
  game: {
    
    // Challenge types
    challengeTypes: [
      {
        id: 'creative-problem-solving',
        name: 'Creative Problem Solving',
        description: 'Challenges that test your ability to think outside the box and generate novel solutions.',
        formatTypes: ['scenario', 'open-ended', 'design-challenge'],
        focusAreas: ['Creative AI Applications', 'Human-AI Collaboration'],
        leveragedTraits: ['creativity', 'adaptability', 'riskTaking'],
        progressionPath: ['critical-analysis', 'ethical-dilemma']
      },
      {
        id: 'critical-analysis',
        name: 'Critical Analysis',
        description: 'Challenges that test your ability to evaluate information, identify patterns, and draw conclusions.',
        formatTypes: ['case-study', 'comparative', 'analysis'],
        focusAreas: ['AI Ethics', 'AI Impact on Society', 'AI Literacy'],
        leveragedTraits: ['analyticalThinking', 'creativity'],
        progressionPath: ['ethical-dilemma', 'strategic-planning']
      },
      {
        id: 'ethical-dilemma',
        name: 'Ethical Dilemma',
        description: 'Challenges that present complex ethical scenarios requiring nuanced judgment.',
        formatTypes: ['scenario', 'debate', 'policy-recommendation'],
        focusAreas: ['AI Ethics', 'AI Impact on Society'],
        leveragedTraits: ['empathy', 'analyticalThinking'],
        progressionPath: ['perspective-taking', 'strategic-planning']
      },
      {
        id: 'perspective-taking',
        name: 'Perspective Taking',
        description: 'Challenges that require you to understand and consider multiple viewpoints.',
        formatTypes: ['role-play', 'stakeholder-analysis', 'narrative'],
        focusAreas: ['Human-AI Collaboration', 'AI Impact on Society', 'Future of Work with AI'],
        leveragedTraits: ['empathy', 'adaptability'],
        progressionPath: ['creative-problem-solving', 'ethical-dilemma']
      },
      {
        id: 'strategic-planning',
        name: 'Strategic Planning',
        description: 'Challenges that test your ability to develop effective strategies and anticipate consequences.',
        formatTypes: ['scenario', 'planning-exercise', 'forecasting'],
        focusAreas: ['Future of Work with AI', 'AI Literacy', 'Human-AI Collaboration'],
        leveragedTraits: ['analyticalThinking', 'riskTaking', 'adaptability'],
        progressionPath: ['creative-problem-solving', 'critical-analysis']
      },
      {
        id: 'adaptive-thinking',
        name: 'Adaptive Thinking',
        description: 'Challenges that test your ability to respond to changing conditions.',
        formatTypes: ['scenario', 'simulation', 'unexpected-twist'],
        focusAreas: ['Human-AI Collaboration', 'Future of Work with AI', 'Critical Thinking with AI'],
        leveragedTraits: ['adaptability', 'riskTaking'],
        progressionPath: ['strategic-planning', 'creative-problem-solving']
      }
    ],
    
    // Challenge format types
    formatTypes: {
      'scenario': {
        promptStructure: 'context-problem-constraints',
        responseFormat: 'open-text',
        evaluationCriteria: ['creativity', 'feasibility', 'thoroughness']
      },
      'case-study': {
        promptStructure: 'background-data-questions',
        responseFormat: 'structured-analysis',
        evaluationCriteria: ['analysis-depth', 'evidence-use', 'insight']
      },
      'debate': {
        promptStructure: 'topic-positions-guidelines',
        responseFormat: 'position-defense',
        evaluationCriteria: ['argument-quality', 'counter-argument-handling', 'persuasiveness']
      },
      'open-ended': {
        promptStructure: 'context-challenge-freedom',
        responseFormat: 'creative-solution',
        evaluationCriteria: ['originality', 'value', 'explanation']
      },
      'design-challenge': {
        promptStructure: 'need-constraints-goals',
        responseFormat: 'design-solution',
        evaluationCriteria: ['innovation', 'usability', 'feasibility']
      },
      'comparative': {
        promptStructure: 'options-criteria-context',
        responseFormat: 'comparative-analysis',
        evaluationCriteria: ['analysis-depth', 'fairness', 'conclusion-quality']
      },
      'role-play': {
        promptStructure: 'character-situation-objectives',
        responseFormat: 'in-character-response',
        evaluationCriteria: ['perspective-adoption', 'consistency', 'insight']
      }
    },
    
    // Difficulty progression
    difficultyLevels: {
      'beginner': {
        questionCount: 1,
        contextComplexity: 0.3,
        standardTime: 300 // seconds
      },
      'intermediate': {
        questionCount: 2,
        contextComplexity: 0.6,
        standardTime: 240 // seconds
      },
      'advanced': {
        questionCount: 3,
        contextComplexity: 0.8,
        standardTime: 180 // seconds
      },
      'expert': {
        questionCount: 3,
        contextComplexity: 1.0,
        standardTime: 150 // seconds
      }
    }
  }
};
