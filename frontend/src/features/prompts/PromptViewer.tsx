'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGameStore } from '@/store/useGameStore';

// Define prompt types
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

// Sample prompt templates - these would come from an API in a real implementation
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'trait-assessment',
    name: 'Trait Assessment Generation',
    description: 'Generates questions for assessing human traits',
    template: `You are an AI assistant helping to assess human characteristics.

Please generate a set of questions that will help evaluate the following human traits:
{{traits}}

For each trait, create 2-3 questions that can be answered on a scale of 1-10.
Questions should be engaging and designed to accurately measure the trait.
The assessment should take no more than 10 minutes to complete.`,
    variables: ['traits']
  },
  {
    id: 'focus-areas',
    name: 'Focus Areas Generation',
    description: 'Recommends focus areas based on trait assessment',
    template: `You are an AI assistant helping to identify human strengths.

Based on the following trait assessment:
{{traitScores}}

Please recommend 3-5 focus areas where these human traits provide advantages over AI.
For each focus area, provide:
1. A descriptive name
2. A brief description (1-2 sentences)
3. How the user's traits make them effective in this area
4. A score (1-100) indicating how well the user's traits match this focus area`,
    variables: ['traitScores']
  },
  {
    id: 'round1-challenge',
    name: 'Round 1 Challenge',
    description: 'Generates the initial challenge for Round 1',
    template: `You are an AI assistant helping to create a challenge that will test a user's distinctive human capabilities in their chosen focus area.

TRAITS:
{{traits}}

FOCUS AREA:
{{focusArea}}

Create a thought-provoking challenge that:
1. Is specific to the focus area
2. Leverages the user's strongest traits
3. Highlights human advantages over AI
4. Is clearly articulated and engaging

The challenge should be concise but detailed enough to elicit a meaningful response.`,
    variables: ['traits', 'focusArea']
  },
  {
    id: 'round2-ai-response',
    name: 'Round 2 AI Response',
    description: 'Generates the AI response to the user\'s solution',
    template: `You are an AI assistant demonstrating how AI would approach a specific challenge.

CHALLENGE:
{{challenge}}

USER'S APPROACH:
{{userResponse}}

Provide a detailed response showing how you as an AI would approach this challenge. Be honest about:
1. What you can do well with this challenge
2. Where you might struggle compared to a human
3. The methodology and approach you would take

Your response should be professional, thoughtful, and highlight both AI capabilities and limitations.`,
    variables: ['challenge', 'userResponse']
  },
  {
    id: 'round3-challenge',
    name: 'Round 3 Enhanced Challenge',
    description: 'Generates the final challenge for Round 3',
    template: `You are an AI assistant creating a final challenge to highlight human edge capabilities.

PREVIOUS CHALLENGE:
{{round1Challenge}}

USER'S RESPONSE:
{{round1Response}}

AI'S APPROACH:
{{aiResponse}}

USER'S ANALYSIS:
{{round2Analysis}}

Create a more complex final challenge that:
1. Builds on the insights from the previous rounds
2. Specifically targets areas where the user has demonstrated human advantages
3. Pushes the user to further articulate their unique human perspective
4. Is more nuanced and requires distinctly human capabilities to solve effectively

The challenge should feel like a meaningful evolution, not just a repeat of round 1.`,
    variables: ['round1Challenge', 'round1Response', 'aiResponse', 'round2Analysis']
  },
  {
    id: 'profile-generation',
    name: 'Profile Generation',
    description: 'Generates the final human edge profile',
    template: `You are an AI assistant creating a "Human Edge Profile" that highlights a person's unique advantages compared to AI.

TRAITS:
{{traits}}

FOCUS AREA:
{{focusArea}}

ROUND 1 CHALLENGE & RESPONSE:
{{round1Challenge}}
{{round1Response}}

ROUND 2 AI APPROACH & USER ANALYSIS:
{{aiResponse}}
{{round2Analysis}}

ROUND 3 CHALLENGE & RESPONSE:
{{round3Challenge}}
{{round3Response}}

Create a comprehensive Human Edge Profile that includes:
1. A summary of their 3-5 strongest human capabilities based on all responses
2. Specific insights about how these capabilities give them advantages over AI
3. 3-5 strategic recommendations for leveraging these capabilities effectively
4. A concise "human edge statement" that captures their unique value proposition

The profile should be encouraging, insightful, and provide actionable guidance.`,
    variables: ['traits', 'focusArea', 'round1Challenge', 'round1Response', 'aiResponse', 'round2Analysis', 'round3Challenge', 'round3Response']
  }
];

export default function PromptViewer() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(PROMPT_TEMPLATES[0].id);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate>(PROMPT_TEMPLATES[0]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [compiledPrompt, setCompiledPrompt] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<string>('');
  
  // Get game state to pre-populate variables
  const gameState = useGameStore();
  
  // Update selected prompt when dropdown changes
  useEffect(() => {
    const prompt = PROMPT_TEMPLATES.find(p => p.id === selectedPromptId);
    if (prompt) {
      setSelectedPrompt(prompt);
      
      // Initialize variables for the selected prompt
      const newVariables: Record<string, string> = {};
      prompt.variables.forEach(variable => {
        newVariables[variable] = '';
      });
      setVariables(newVariables);
      
      // Pre-populate variables based on game state if available
      if (gameState) {
        if (prompt.id === 'trait-assessment') {
          // Example pre-population for trait assessment
          newVariables['traits'] = 'Creativity, Empathy, Critical Thinking, Adaptability, Leadership';
        } else if (prompt.id === 'focus-areas' && gameState.traits.length > 0) {
          newVariables['traitScores'] = gameState.traits.map(trait => 
            `${trait.name}: ${trait.value}/10`
          ).join('\n');
        } else if ((prompt.id === 'round1-challenge' || prompt.id === 'profile-generation') && gameState.traits.length > 0 && gameState.focus) {
          newVariables['traits'] = gameState.traits.map(trait => 
            `${trait.name}: ${trait.value}/10`
          ).join('\n');
          newVariables['focusArea'] = `${gameState.focus.name}: ${gameState.focus.description}`;
        } else if (prompt.id === 'round2-ai-response' && gameState.responses.round1) {
          newVariables['challenge'] = gameState.responses.round1.challenge || '';
          newVariables['userResponse'] = gameState.responses.round1.userResponse || '';
        } else if (prompt.id === 'round3-challenge' && gameState.responses.round1 && gameState.responses.round2) {
          newVariables['round1Challenge'] = gameState.responses.round1.challenge || '';
          newVariables['round1Response'] = gameState.responses.round1.userResponse || '';
          newVariables['aiResponse'] = gameState.responses.round2.aiResponse || '';
          newVariables['round2Analysis'] = gameState.responses.round2.userResponse || '';
        } else if (prompt.id === 'profile-generation' && gameState.responses.round1 && gameState.responses.round2 && gameState.responses.round3) {
          newVariables['round1Challenge'] = gameState.responses.round1.challenge || '';
          newVariables['round1Response'] = gameState.responses.round1.userResponse || '';
          newVariables['aiResponse'] = gameState.responses.round2.aiResponse || '';
          newVariables['round2Analysis'] = gameState.responses.round2.userResponse || '';
          newVariables['round3Challenge'] = gameState.responses.round3.challenge || '';
          newVariables['round3Response'] = gameState.responses.round3.userResponse || '';
        }
      }
      
      setVariables(newVariables);
    }
  }, [selectedPromptId, gameState]);
  
  // Compile prompt when variables change
  useEffect(() => {
    let compiled = selectedPrompt.template;
    Object.entries(variables).forEach(([key, value]) => {
      compiled = compiled.replace(`{{${key}}}`, value);
    });
    setCompiledPrompt(compiled);
  }, [selectedPrompt, variables]);
  
  // Handle variable input changes
  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variable]: value
    }));
  };
  
  // Simulate testing the prompt with OpenAI
  const handleTestPrompt = () => {
    setIsTesting(true);
    
    // In a real implementation, this would call the OpenAI API
    // For now, we're just simulating the response after a delay
    setTimeout(() => {
      const simulatedResponse = `This is a simulated response for the ${selectedPrompt.name} prompt. 
      
In a production environment, this would send the compiled prompt to the OpenAI API and return the actual completion.

The variables you provided were:
${Object.entries(variables).map(([key, value]) => `- ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`).join('\n')}

Prompt length: ${compiledPrompt.length} characters`;
      
      setTestResponse(simulatedResponse);
      setIsTesting(false);
    }, 1500);
  };
  
  return (
    <div className="space-y-8">
      {/* Prompt Selection */}
      <div className="space-y-2">
        <Label htmlFor="prompt-select">Select Prompt Template</Label>
        <Select
          value={selectedPromptId}
          onValueChange={(value) => setSelectedPromptId(value)}
        >
          <SelectTrigger id="prompt-select" className="w-full">
            <SelectValue placeholder="Select a prompt template" />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TEMPLATES.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                {prompt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedPrompt.description}
        </p>
      </div>
      
      {/* Variables Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Prompt Variables</h3>
        {Object.keys(variables).length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">This prompt has no variables to fill.</p>
        ) : (
          <div className="grid gap-4">
            {Object.keys(variables).map((variable) => (
              <div key={variable} className="space-y-2">
                <Label htmlFor={`var-${variable}`}>{variable}</Label>
                {variable.includes('response') || variable.length > 20 ? (
                  <Textarea
                    id={`var-${variable}`}
                    value={variables[variable]}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    placeholder={`Enter value for ${variable}`}
                    className="min-h-[100px]"
                  />
                ) : (
                  <Input
                    id={`var-${variable}`}
                    value={variables[variable]}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    placeholder={`Enter value for ${variable}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Compiled Prompt */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Compiled Prompt</h3>
          <Button 
            onClick={handleTestPrompt}
            disabled={isTesting}
            size="sm"
          >
            {isTesting ? 'Testing...' : 'Test Prompt'}
          </Button>
        </div>
        <Card>
          <CardContent className="p-4">
            <pre className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[300px]">
              {compiledPrompt}
            </pre>
          </CardContent>
        </Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Character count: {compiledPrompt.length} (OpenAI limits vary by model)
        </p>
      </div>
      
      {/* Test Response */}
      {testResponse && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Test Response</h3>
          <Card>
            <CardContent className="p-4">
              <pre className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[300px]">
                {testResponse}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
