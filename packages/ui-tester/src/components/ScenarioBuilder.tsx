import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApiEndpoint, Scenario, ScenarioStep } from '../types/api';
import FormInputGenerator from './FormInputGenerator';

// Define the same types from FormInputGenerator to keep consistency
interface PathParam {
  name: string;
  value: string;
}

interface QueryParam {
  name: string;
  value: string;
}

// New interface for variable extraction
interface VariableExtraction {
  id: string;
  name: string;
  jsonPath: string;
}

interface ScenarioBuilderProps {
  endpoints: ApiEndpoint[];
  baseUrl: string;
}

const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ endpoints, baseUrl }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  // Store variables extracted during scenario execution
  const [extractedVariables, setExtractedVariables] = useState<Record<string, any>>({});

  // Load saved scenarios from local storage
  useEffect(() => {
    const savedScenarios = localStorage.getItem('scenarios');
    if (savedScenarios) {
      try {
        setScenarios(JSON.parse(savedScenarios));
      } catch (error) {
        console.error('Failed to load scenarios from local storage', error);
      }
    }
  }, []);

  // Save scenarios to local storage when they change
  useEffect(() => {
    if (scenarios.length > 0) {
      localStorage.setItem('scenarios', JSON.stringify(scenarios));
    }
  }, [scenarios]);

  const createNewScenario = () => {
    const newScenario: Scenario = {
      id: uuidv4(),
      name: 'New Scenario',
      description: '',
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setScenarios([...scenarios, newScenario]);
    setCurrentScenario(newScenario);
  };

  const updateScenario = (updatedScenario: Scenario) => {
    updatedScenario.updatedAt = new Date().toISOString();
    setScenarios(scenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    setCurrentScenario(updatedScenario);
  };

  const handleScenarioNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentScenario) return;

    const updated = { ...currentScenario, name: e.target.value };
    updateScenario(updated);
  };

  const handleScenarioDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentScenario) return;

    const updated = { ...currentScenario, description: e.target.value };
    updateScenario(updated);
  };

  const addStepToScenario = (
    pathParams: PathParam[],
    queryParams: QueryParam[],
    body: any
  ) => {
    if (!currentScenario || !selectedEndpoint) return;

    const newStep: ScenarioStep = {
      id: uuidv4(),
      name: `Step ${currentScenario.steps.length + 1}: ${selectedEndpoint.name}`,
      endpoint: selectedEndpoint,
      pathParams,
      queryParams,
      requestBody: body,
      delay: 500, // Default delay between steps
      variableExtractions: [] // Initialize empty variable extractions
    };

    const updatedSteps = [...currentScenario.steps, newStep];
    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);

    // Clear the selected endpoint after adding a step
    setSelectedEndpoint(null);
  };

  const updateStep = (index: number, updatedStep: ScenarioStep) => {
    if (!currentScenario) return;

    const updatedSteps = [...currentScenario.steps];
    updatedSteps[index] = updatedStep;

    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);
  };

  const removeStep = (index: number) => {
    if (!currentScenario) return;

    const updatedSteps = currentScenario.steps.filter((_, i) => i !== index);
    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);
  };

  const duplicateStep = (index: number) => {
    if (!currentScenario) return;

    const stepToCopy = currentScenario.steps[index];
    const newStep: ScenarioStep = {
      ...JSON.parse(JSON.stringify(stepToCopy)), // Deep clone to avoid reference issues
      id: uuidv4(), // Generate a new ID
      name: `Copy of ${stepToCopy.name}`,
      status: undefined, // Reset status
      response: undefined // Reset response
    };

    const updatedSteps = [...currentScenario.steps];
    // Insert after the current step
    updatedSteps.splice(index + 1, 0, newStep);

    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);
  };

  const moveStepUp = (index: number) => {
    if (!currentScenario || index === 0) return;

    const updatedSteps = [...currentScenario.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index - 1];
    updatedSteps[index - 1] = temp;

    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);
  };

  const moveStepDown = (index: number) => {
    if (!currentScenario || index === currentScenario.steps.length - 1) return;

    const updatedSteps = [...currentScenario.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index + 1];
    updatedSteps[index + 1] = temp;

    const updated = { ...currentScenario, steps: updatedSteps };
    updateScenario(updated);
  };

  // Get value from object using JSONPath-like syntax
  const getValueByJsonPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      // Handle array indexing with [n] syntax
      if (part.includes('[') && part.includes(']')) {
        const arrName = part.substring(0, part.indexOf('['));
        const indexStr = part.substring(part.indexOf('[') + 1, part.indexOf(']'));
        const index = parseInt(indexStr, 10);

        current = current[arrName]?.[index];
      } else {
        current = current[part];
      }
    }

    return current;
  };

  // Replace variables in a string, pattern: {{variableName}}
  const replaceVariables = (text: string, variables: Record<string, any>): string => {
    if (!text || typeof text !== 'string') return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const value = variables[variableName];
      return value !== undefined ? String(value) : match;
    });
  };

  // Process an object (string, object, array) and replace all variable references
  const processVariables = (input: any, variables: Record<string, any>): any => {
    if (input === null || input === undefined) return input;

    // Handle strings with variable references
    if (typeof input === 'string') {
      return replaceVariables(input, variables);
    }

    // Handle arrays
    if (Array.isArray(input)) {
      return input.map(item => processVariables(item, variables));
    }

    // Handle objects
    if (typeof input === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = processVariables(value, variables);
      }
      return result;
    }

    // Return unchanged for other types
    return input;
  };

  const executeScenario = async () => {
    if (!currentScenario || currentScenario.steps.length === 0 || isRunning) return;

    setIsRunning(true);
    // Reset extracted variables before execution
    setExtractedVariables({});
    const variables: Record<string, any> = {};

    // Reset all step statuses with a properly typed copy
    const updatedSteps: ScenarioStep[] = currentScenario.steps.map(step => ({
      ...step,
      status: 'pending',
      response: undefined
    }));

    const updatedScenario = { ...currentScenario, steps: updatedSteps };
    updateScenario(updatedScenario);

    // Execute steps sequentially
    for (let i = 0; i < updatedScenario.steps.length; i++) {
      setActiveStepIndex(i);

      const step = updatedScenario.steps[i];

      try {
        // Build the URL with path parameters, replace variables
        let url = `${baseUrl}${step.endpoint.path}`;
        step.pathParams.forEach(param => {
          // Replace variables in path parameter values
          const processedValue = processVariables(param.value, variables);
          url = url.replace(`{${param.name}}`, encodeURIComponent(processedValue));
        });

        // Add query parameters, replace variables
        if (step.queryParams.length > 0) {
          const queryString = step.queryParams
            .filter(param => param.name && param.value)
            .map(param => {
              // Replace variables in query parameter values
              const processedValue = processVariables(param.value, variables);
              return `${encodeURIComponent(param.name)}=${encodeURIComponent(processedValue)}`;
            })
            .join('&');

          if (queryString) {
            url += `?${queryString}`;
          }
        }

        // Prepare the fetch options
        const options: RequestInit = {
          method: step.endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        };

        // Add body for non-GET requests, replace variables
        if (['POST', 'PUT', 'PATCH'].includes(step.endpoint.method) && step.requestBody) {
          const processedBody = processVariables(step.requestBody, variables);
          options.body = JSON.stringify(processedBody);
        }

        // Execute the request
        const response = await fetch(url, options);
        const responseData = await response.json();

        // Extract variables from response based on configured extractions
        if (step.variableExtractions && step.variableExtractions.length > 0) {
          step.variableExtractions.forEach(extraction => {
            try {
              const extractedValue = getValueByJsonPath(responseData, extraction.jsonPath);
              if (extractedValue !== undefined) {
                variables[extraction.name] = extractedValue;
              }
            } catch (error) {
              console.error(`Failed to extract variable ${extraction.name}:`, error);
            }
          });
        }

        // Update extracted variables in state for UI display
        setExtractedVariables(variables);

        // Update the step with the response
        const updatedStep: ScenarioStep = {
          ...step,
          status: response.ok ? 'success' : 'error',
          response: responseData
        };

        // Update the scenario with the response
        const stepsCopy = [...updatedScenario.steps];
        stepsCopy[i] = updatedStep;
        const scenarioWithResponse = { ...updatedScenario, steps: stepsCopy };
        updateScenario(scenarioWithResponse);

        // Wait for the specified delay before the next step
        if (i < updatedScenario.steps.length - 1 && step.delay) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
      } catch (error) {
        console.error(`Error executing step ${i}:`, error);

        // Update step with error
        const updatedStep: ScenarioStep = {
          ...step,
          status: 'error',
          response: { error: (error as Error).message }
        };

        const stepsCopy = [...updatedScenario.steps];
        stepsCopy[i] = updatedStep;
        const scenarioWithError = { ...updatedScenario, steps: stepsCopy };
        updateScenario(scenarioWithError);

        // Stop execution if a step fails
        break;
      }
    }

    setIsRunning(false);
    setActiveStepIndex(-1);
  };

  const deleteScenario = (id: string) => {
    const filtered = scenarios.filter(s => s.id !== id);
    setScenarios(filtered);

    if (currentScenario?.id === id) {
      setCurrentScenario(filtered.length > 0 ? filtered[0] : null);
    }
  };

  const handleStepDelayChange = (index: number, delay: number) => {
    if (!currentScenario) return;

    const updatedStep = {
      ...currentScenario.steps[index],
      delay
    };

    updateStep(index, updatedStep);
  };

  const handleStepNameChange = (index: number, name: string) => {
    if (!currentScenario) return;

    const updatedStep = {
      ...currentScenario.steps[index],
      name
    };

    updateStep(index, updatedStep);
  };

  // Add a new variable extraction to a step
  const addVariableExtraction = (stepIndex: number) => {
    if (!currentScenario) return;

    const step = currentScenario.steps[stepIndex];
    const newExtraction: VariableExtraction = {
      id: uuidv4(),
      name: '',
      jsonPath: ''
    };

    const updatedStep = {
      ...step,
      variableExtractions: [...(step.variableExtractions || []), newExtraction]
    };

    updateStep(stepIndex, updatedStep);
  };

  // Update a variable extraction
  const updateVariableExtraction = (
    stepIndex: number,
    extractionIndex: number,
    updates: Partial<VariableExtraction>
  ) => {
    if (!currentScenario) return;

    const step = currentScenario.steps[stepIndex];
    if (!step.variableExtractions) return;

    const updatedExtractions = [...step.variableExtractions];
    updatedExtractions[extractionIndex] = {
      ...updatedExtractions[extractionIndex],
      ...updates
    };

    const updatedStep = {
      ...step,
      variableExtractions: updatedExtractions
    };

    updateStep(stepIndex, updatedStep);
  };

  // Remove a variable extraction
  const removeVariableExtraction = (stepIndex: number, extractionIndex: number) => {
    if (!currentScenario) return;

    const step = currentScenario.steps[stepIndex];
    if (!step.variableExtractions) return;

    const updatedExtractions = step.variableExtractions.filter((_, i) => i !== extractionIndex);

    const updatedStep = {
      ...step,
      variableExtractions: updatedExtractions
    };

    updateStep(stepIndex, updatedStep);
  };

  // Formats JSON for display
  const formatJSON = (json: any): string => {
    return JSON.stringify(json, null, 2);
  };

  // Add a help section to show available variables
  const renderVariableHelp = () => {
    if (Object.keys(extractedVariables).length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-semibold mb-2">Available Variables</h4>
        <p className="text-xs mb-2">Use these variables in any field with {{variableName}} syntax</p>
        <div className="text-xs font-mono bg-white p-2 rounded overflow-x-auto">
          {Object.entries(extractedVariables).map(([name, value]) => (
            <div key={name} className="mb-1">
              <span className="font-semibold">{name}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full max-h-[calc(100vh-150px)] overflow-hidden">
      <div className="w-[250px] bg-gray-100 p-4 border-r border-gray-300 overflow-y-auto">
        <h2 className="mt-0 mb-4">Scenarios</h2>
        <button
          onClick={createNewScenario}
          className="w-full mb-4 bg-blue-500 text-white border-none rounded px-3 py-2 cursor-pointer hover:bg-blue-600"
        >
          Create New Scenario
        </button>
        <ul className="list-none p-0 my-4">
          {scenarios.map(scenario => (
            <li
              key={scenario.id}
              className={`p-2.5 rounded mb-1 cursor-pointer flex justify-between items-center
                ${currentScenario?.id === scenario.id ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-200'}`}
              onClick={() => setCurrentScenario(scenario)}
            >
              <span>{scenario.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteScenario(scenario.id);
                }}
                className="bg-transparent text-gray-500 text-lg p-0 mx-1 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {currentScenario ? (
          <>
            <div className="flex justify-between items-start mb-5">
              <div className="flex-1">
                <input
                  type="text"
                  value={currentScenario.name}
                  onChange={handleScenarioNameChange}
                  className="text-xl font-bold p-2 border border-gray-300 rounded w-full mb-2.5"
                />
                <textarea
                  value={currentScenario.description}
                  onChange={handleScenarioDescriptionChange}
                  placeholder="Scenario description..."
                  className="w-full h-[60px] p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="ml-5">
                <button
                  onClick={executeScenario}
                  disabled={isRunning || currentScenario.steps.length === 0}
                  className={`px-4 py-2.5 rounded text-white text-base
                    ${isRunning || currentScenario.steps.length === 0
                      ? 'bg-green-200 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 cursor-pointer'}`}
                >
                  Run Scenario
                </button>
              </div>
            </div>

            {renderVariableHelp()}

            <div className="mb-8">
              <h3 className="mb-4">Steps</h3>
              {currentScenario.steps.length === 0 ? (
                <div className="p-5 text-center text-gray-500 bg-gray-100 rounded">
                  No steps added yet. Select an endpoint below to add a step.
                </div>
              ) : (
                <div className="border border-gray-300 rounded">
                  {currentScenario.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`border-b border-gray-300 p-4 last:border-b-0 transition-all duration-200
                        ${index === activeStepIndex ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''}
                        ${step.status === 'success' ? 'bg-green-50 border-l-4 border-l-green-500' : ''}
                        ${step.status === 'error' ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                        ${step.status === 'pending' ? 'bg-blue-50 border-l-4 border-l-blue-500 opacity-80' : ''}`}
                    >
                      {/* Step header with status indicator */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700">
                            {index + 1}
                          </div>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => handleStepNameChange(index, e.target.value)}
                            className="font-bold flex-1 p-1.5 border border-gray-300 rounded"
                          />
                          {step.status && (
                            <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-bold
                              ${step.status === 'success' ? 'bg-green-100 text-green-800' :
                                step.status === 'error' ? 'bg-red-100 text-red-800' :
                                step.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`
                            }>
                              {step.status === 'success' ? 'Success' :
                                step.status === 'error' ? 'Failed' :
                                step.status === 'pending' ? 'Running' : 'Ready'}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => moveStepUp(index)}
                            disabled={index === 0}
                            className="p-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                            title="Move step up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveStepDown(index)}
                            disabled={index === currentScenario.steps.length - 1}
                            className="p-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                            title="Move step down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => duplicateStep(index)}
                            className="p-1.5 bg-blue-100 border border-blue-300 rounded text-blue-700 hover:bg-blue-200"
                            title="Duplicate step"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeStep(index)}
                            className="p-1.5 bg-red-100 border border-red-300 rounded text-red-700 hover:bg-red-200"
                            title="Remove step"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 bg-gray-100 p-2 rounded">
                        <span className={`method ${step.endpoint.method.toLowerCase()} text-xs rounded-full px-2 py-1`}>
                          {step.endpoint.method}
                        </span>
                        <span className="font-mono text-sm truncate flex-1">{step.endpoint.path}</span>
                      </div>

                      {/* Variable Extraction Section */}
                      <div className="mb-3 p-3 border border-gray-200 rounded bg-blue-50">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-sm font-semibold m-0">Variable Extractions</h5>
                          <button
                            onClick={() => addVariableExtraction(index)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            + Add Extraction
                          </button>
                        </div>

                        {!step.variableExtractions || step.variableExtractions.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No variables defined. Add extractions to use values in later steps.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {step.variableExtractions.map((extraction, extractionIndex) => (
                              <div key={extraction.id} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={extraction.name}
                                  onChange={(e) => updateVariableExtraction(
                                    index,
                                    extractionIndex,
                                    { name: e.target.value }
                                  )}
                                  placeholder="Variable name"
                                  className="flex-1 p-1 text-xs border border-gray-300 rounded"
                                />
                                <span className="text-xs">=</span>
                                <input
                                  type="text"
                                  value={extraction.jsonPath}
                                  onChange={(e) => updateVariableExtraction(
                                    index,
                                    extractionIndex,
                                    { jsonPath: e.target.value }
                                  )}
                                  placeholder="response.data.id"
                                  className="flex-2 p-1 text-xs border border-gray-300 rounded font-mono"
                                />
                                <button
                                  onClick={() => removeVariableExtraction(index, extractionIndex)}
                                  className="p-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          <p>
                            Example: Extract 'token' from response.data.token and use it later with {"{{token}}"}
                          </p>
                        </div>
                      </div>

                      <div className="flex mb-2.5 gap-2">
                        <div className="w-1/2">
                          <h5 className="text-xs font-semibold mb-1">Delay after step (ms):</h5>
                          <input
                            type="number"
                            min="0"
                            value={step.delay || 0}
                            onChange={(e) => handleStepDelayChange(index, parseInt(e.target.value, 10))}
                            className="w-full p-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {step.response && (
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <details>
                            <summary className="text-sm font-semibold mb-1 cursor-pointer select-none">
                              Response {step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : ''}
                            </summary>
                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-2">
                              {formatJSON(step.response)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <h3 className="mb-4">Add Step</h3>
              <div className="mb-4">
                <label className="block mb-2 font-medium text-sm">Select Endpoint:</label>
                <select
                  value={selectedEndpoint ? `${selectedEndpoint.method}-${selectedEndpoint.path}` : ''}
                  onChange={(e) => {
                    const [method, ...pathParts] = e.target.value.split('-');
                    const path = pathParts.join('-'); // Rejoin in case path contained hyphens
                    const endpoint = endpoints.find(ep =>
                      ep.method === method && ep.path === path
                    );
                    setSelectedEndpoint(endpoint || null);
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Select an endpoint --</option>
                  {endpoints.map((endpoint, i) => (
                    <option
                      key={i}
                      value={`${endpoint.method}-${endpoint.path}`}
                    >
                      {endpoint.method} {endpoint.path} - {endpoint.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEndpoint && (
                <div className="border border-gray-300 rounded p-4">
                  <h4 className="text-sm font-semibold mb-4">
                    {selectedEndpoint.method} {selectedEndpoint.path}
                  </h4>
                  <p className="text-sm mb-4">{selectedEndpoint.description}</p>
                  <FormInputGenerator
                    endpoint={selectedEndpoint}
                    onSubmit={addStepToScenario}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-5 text-center text-gray-500 bg-gray-100 rounded">
            Select a scenario from the list or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioBuilder;
