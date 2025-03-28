/**
 * Challenge Configuration Seed Data
 * 
 * Initial seed data for challenge types, format types, focus areas, and difficulty levels.
 * Used to populate the database tables when initializing the application.
 */

const { v4: uuidv4 } = require('uuid');

// Challenge type seed data
const challengeTypes = [
  {
    id: uuidv4(),
    code: 'critical-analysis',
    name: 'Critical Analysis',
    description: 'Challenges that require analyzing content, identifying assumptions, and evaluating arguments.',
    formatTypes: ['essay', 'text-response', 'scenario-analysis'],
    focusAreas: ['critical-thinking', 'analytical-reasoning', 'logic'],
    leveragedTraits: ['analytical', 'detail-oriented', 'skeptical'],
    progressionPath: ['pattern-recognition', 'logical-analysis', 'critique-formulation'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'creative-problem-solving',
    name: 'Creative Problem Solving',
    description: 'Challenges that require generating novel solutions to complex problems.',
    formatTypes: ['scenario-response', 'idea-generation', 'design-task'],
    focusAreas: ['creativity', 'innovation', 'problem-solving'],
    leveragedTraits: ['creative', 'unconventional', 'exploratory'],
    progressionPath: ['idea-fluency', 'originality', 'elaboration'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'ethical-reasoning',
    name: 'Ethical Reasoning',
    description: 'Challenges that require understanding and applying ethical principles to complex situations.',
    formatTypes: ['case-study', 'essay', 'scenario-analysis'],
    focusAreas: ['ai-ethics', 'ethical-decision-making', 'values-alignment'],
    leveragedTraits: ['empathetic', 'principled', 'reflective'],
    progressionPath: ['ethical-awareness', 'principled-reasoning', 'moral-imagination'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'strategic-planning',
    name: 'Strategic Planning',
    description: 'Challenges that require developing long-term strategies and considering multiple variables.',
    formatTypes: ['planning-task', 'scenario-response', 'case-study'],
    focusAreas: ['long-term-thinking', 'systems-thinking', 'decision-making'],
    leveragedTraits: ['analytical', 'forward-thinking', 'pragmatic'],
    progressionPath: ['system-mapping', 'opportunity-identification', 'strategy-formulation'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'human-ai-collaboration',
    name: 'Human-AI Collaboration',
    description: 'Challenges that explore effective ways to work with AI systems.',
    formatTypes: ['scenario-response', 'prompt-engineering', 'critique-task'],
    focusAreas: ['human-ai-collaboration', 'ai-literacy', 'prompt-engineering'],
    leveragedTraits: ['adaptable', 'communicative', 'curious'],
    progressionPath: ['ai-awareness', 'interaction-design', 'collaboration-optimization'],
    isActive: true
  }
];

// Format type seed data
const formatTypes = [
  {
    id: uuidv4(),
    code: 'essay',
    name: 'Essay',
    description: 'A structured written response with introduction, body paragraphs, and conclusion.',
    promptStructure: 'Context + question + specific requirements',
    responseFormat: 'Structured essay with thesis, arguments, and conclusion',
    evaluationCriteria: ['clarity', 'coherence', 'evidence', 'originality'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'text-response',
    name: 'Text Response',
    description: 'A concise written response to a specific question or prompt.',
    promptStructure: 'Direct question or instruction',
    responseFormat: 'Focused paragraph or short text',
    evaluationCriteria: ['relevance', 'clarity', 'conciseness', 'insight'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'scenario-analysis',
    name: 'Scenario Analysis',
    description: 'Analysis of a complex scenario with multiple factors to consider.',
    promptStructure: 'Detailed scenario + specific analysis questions',
    responseFormat: 'Structured analysis with key insights and recommendations',
    evaluationCriteria: ['comprehensiveness', 'insight', 'practical-application', 'depth'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'scenario-response',
    name: 'Scenario Response',
    description: 'A response to a hypothetical situation requiring decision-making.',
    promptStructure: 'Scenario + decision point + constraints',
    responseFormat: 'Decision with justification and consideration of alternatives',
    evaluationCriteria: ['decision-quality', 'reasoning', 'consideration-of-constraints'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'idea-generation',
    name: 'Idea Generation',
    description: 'Creating multiple novel ideas or solutions to a given problem.',
    promptStructure: 'Problem statement + constraints + evaluation criteria',
    responseFormat: 'Multiple distinct ideas with brief explanations',
    evaluationCriteria: ['quantity', 'originality', 'diversity', 'feasibility'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'design-task',
    name: 'Design Task',
    description: 'Creating a structured design for a system, process, or solution.',
    promptStructure: 'Design brief + requirements + constraints',
    responseFormat: 'Detailed design with components, interactions, and justification',
    evaluationCriteria: ['functionality', 'innovation', 'usability', 'feasibility'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'case-study',
    name: 'Case Study',
    description: 'Analysis of a specific real or fictional example to extract principles.',
    promptStructure: 'Detailed case + guiding questions',
    responseFormat: 'Analysis with key insights, principles, and applications',
    evaluationCriteria: ['insight', 'principle-extraction', 'application', 'thoroughness'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'prompt-engineering',
    name: 'Prompt Engineering',
    description: 'Creating effective prompts to guide AI systems.',
    promptStructure: 'Goal + constraints + example outputs',
    responseFormat: 'Structured prompt with explanation of design choices',
    evaluationCriteria: ['clarity', 'specificity', 'guidance', 'effectiveness'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'critique-task',
    name: 'Critique Task',
    description: 'Evaluating and providing constructive feedback on a given artifact.',
    promptStructure: 'Artifact + evaluation criteria + feedback guidelines',
    responseFormat: 'Structured critique with strengths, weaknesses, and suggestions',
    evaluationCriteria: ['insight', 'constructiveness', 'specificity', 'balance'],
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'planning-task',
    name: 'Planning Task',
    description: 'Developing a structured plan to achieve a specified goal.',
    promptStructure: 'Goal + constraints + requirements',
    responseFormat: 'Detailed plan with steps, resources, and contingencies',
    evaluationCriteria: ['comprehensiveness', 'feasibility', 'effectiveness', 'adaptability'],
    isActive: true
  }
];

// Focus area seed data
const focusAreas = [
  {
    id: uuidv4(),
    code: 'critical-thinking',
    name: 'Critical Thinking',
    description: 'The ability to analyze information objectively and make reasoned judgments.',
    relatedAreas: ['analytical-reasoning', 'problem-solving'],
    prerequisites: [],
    learningOutcomes: {
      knowledge: ['Recognize logical fallacies', 'Understand cognitive biases'],
      skills: ['Evaluate evidence objectively', 'Develop sound arguments']
    },
    isActive: true,
    displayOrder: 1
  },
  {
    id: uuidv4(),
    code: 'analytical-reasoning',
    name: 'Analytical Reasoning',
    description: 'The ability to analyze complex information and identify patterns and relationships.',
    relatedAreas: ['critical-thinking', 'problem-solving'],
    prerequisites: [],
    learningOutcomes: {
      knowledge: ['Understand analytical frameworks', 'Recognize patterns in data'],
      skills: ['Break down complex problems', 'Draw valid inferences from information']
    },
    isActive: true,
    displayOrder: 2
  },
  {
    id: uuidv4(),
    code: 'creativity',
    name: 'Creativity',
    description: 'The ability to generate novel and valuable ideas, solutions, or expressions.',
    relatedAreas: ['innovation', 'divergent-thinking'],
    prerequisites: [],
    learningOutcomes: {
      knowledge: ['Understand creative processes', 'Recognize barriers to creativity'],
      skills: ['Generate novel ideas', 'Make unexpected connections']
    },
    isActive: true,
    displayOrder: 3
  },
  {
    id: uuidv4(),
    code: 'ai-literacy',
    name: 'AI Literacy',
    description: 'Understanding AI capabilities, limitations, and effective usage patterns.',
    relatedAreas: ['human-ai-collaboration', 'ai-ethics'],
    prerequisites: [],
    learningOutcomes: {
      knowledge: ['Understand AI capabilities and limitations', 'Recognize AI biases'],
      skills: ['Evaluate AI outputs critically', 'Use AI tools effectively']
    },
    isActive: true,
    displayOrder: 4
  },
  {
    id: uuidv4(),
    code: 'ai-ethics',
    name: 'AI Ethics',
    description: 'Understanding and applying ethical principles to AI development and use.',
    relatedAreas: ['ai-literacy', 'ethical-decision-making'],
    prerequisites: ['ai-literacy'],
    learningOutcomes: {
      knowledge: ['Understand ethical frameworks for AI', 'Recognize ethical challenges in AI'],
      skills: ['Apply ethical principles to AI cases', 'Evaluate AI systems ethically']
    },
    isActive: true,
    displayOrder: 5
  },
  {
    id: uuidv4(),
    code: 'human-ai-collaboration',
    name: 'Human-AI Collaboration',
    description: 'Effectively working with AI systems to achieve better outcomes than either alone.',
    relatedAreas: ['ai-literacy', 'prompt-engineering'],
    prerequisites: ['ai-literacy'],
    learningOutcomes: {
      knowledge: ["Understand AI's creative potential", "Recognize patterns of innovation"],
      skills: ["Generate novel AI application ideas", "Prototype creative AI solutions"]
    },
    isActive: true,
    displayOrder: 6
  },
  {
    id: uuidv4(),
    code: 'critical-thinking-ai',
    name: 'Critical Thinking with AI',
    description: 'Developing skills to critically evaluate and use AI tools and outputs',
    relatedAreas: ['ai-literacy', 'ai-ethics'],
    prerequisites: ['ai-literacy'],
    learningOutcomes: {
      knowledge: ['Understand AI limitations and biases', 'Recognize patterns of AI failure'],
      skills: ['Verify and validate AI outputs', 'Design testing strategies for AI systems']
    }
  }
];

// Difficulty level seed data
const difficultyLevels = [
  {
    id: uuidv4(),
    code: 'beginner',
    name: 'Beginner',
    description: 'Entry-level challenges requiring basic knowledge and skills.',
    questionCount: 1,
    contextComplexity: 0.3,
    standardTime: 300, // seconds
    sortOrder: 1,
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'intermediate',
    name: 'Intermediate',
    description: 'Mid-level challenges requiring moderate knowledge and skills.',
    questionCount: 2,
    contextComplexity: 0.6,
    standardTime: 240, // seconds
    sortOrder: 2,
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'advanced',
    name: 'Advanced',
    description: 'Higher-level challenges requiring significant knowledge and skills.',
    questionCount: 3,
    contextComplexity: 0.8,
    standardTime: 180, // seconds
    sortOrder: 3,
    isActive: true
  },
  {
    id: uuidv4(),
    code: 'expert',
    name: 'Expert',
    description: 'Expert-level challenges requiring deep knowledge and mastery of skills.',
    questionCount: 3,
    contextComplexity: 1.0,
    standardTime: 150, // seconds
    sortOrder: 4,
    isActive: true
  }
];

module.exports = {
  challengeTypes,
  formatTypes,
  focusAreas,
  difficultyLevels
}; 