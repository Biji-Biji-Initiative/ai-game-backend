import React, { useState, useEffect } from 'react';
import EndpointList from './components/EndpointList';
import ApiTester from './components/ApiTester';
import ResponseViewer from './components/ResponseViewer';
import { ApiEndpoint, TestHistory as TestHistoryType } from './types/api';
import Notifications from './components/Notifications';
import ScenarioBuilder from './components/ScenarioBuilder';
import TestHistory from './components/TestHistory';
import { OpenApiService } from './services/OpenApiService';

// Define predefined environments
interface Environment {
  name: string;
  baseUrl: string;
  isDefault?: boolean;
}

const PREDEFINED_ENVIRONMENTS: Environment[] = [
  { name: 'Local Development', baseUrl: 'http://localhost:3000/api', isDefault: true },
  { name: 'Staging', baseUrl: 'https://staging-api.aifightclub.com/api' },
  { name: 'Production', baseUrl: 'https://api.aifightclub.com/api' },
  { name: 'Mock Server', baseUrl: 'http://localhost:8080/mock/api' },
];

function App() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);
  const [activeTab, setActiveTab] = useState<'tester' | 'scenarios' | 'history'>('tester');
  const [environments, setEnvironments] = useState<Environment[]>(PREDEFINED_ENVIRONMENTS);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>(PREDEFINED_ENVIRONMENTS.find(env => env.isDefault)?.name || PREDEFINED_ENVIRONMENTS[0].name);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [isCustomEnvironment, setIsCustomEnvironment] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>(PREDEFINED_ENVIRONMENTS.find(env => env.isDefault)?.baseUrl || PREDEFINED_ENVIRONMENTS[0].baseUrl);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load environments and baseUrl from localStorage on initial mount
  useEffect(() => {
    const savedEnvironments = localStorage.getItem('apiEnvironments');
    if (savedEnvironments) {
      try {
        const parsedEnvironments = JSON.parse(savedEnvironments);
        setEnvironments(parsedEnvironments);
      } catch (error) {
        console.error('Failed to parse saved environments:', error);
      }
    }

    const savedEnvironment = localStorage.getItem('selectedEnvironment');
    const savedCustomUrl = localStorage.getItem('customBaseUrl');
    const savedIsCustom = localStorage.getItem('isCustomEnvironment');

    if (savedIsCustom === 'true' && savedCustomUrl) {
      setIsCustomEnvironment(true);
      setCustomBaseUrl(savedCustomUrl);
      setBaseUrl(savedCustomUrl);
    } else if (savedEnvironment) {
      setSelectedEnvironment(savedEnvironment);
      const env = PREDEFINED_ENVIRONMENTS.find(e => e.name === savedEnvironment) ||
                 (savedEnvironments ? JSON.parse(savedEnvironments).find((e: Environment) => e.name === savedEnvironment) : null);
      if (env) {
        setBaseUrl(env.baseUrl);
      }
    }
  }, []);

  useEffect(() => {
    const fetchApiSchema = async () => {
      try {
        setLoading(true);

        // Create service instance
        const openApiService = OpenApiService.getInstance();

        // Try to fetch from standard Swagger endpoint
        let schemaUrl = `${baseUrl.replace(/\/api\/?$/, '')}/api-docs/swagger.json`;

        // Fallback to local endpoints.json if Swagger fails
        try {
          await openApiService.fetchSchema(schemaUrl);
        } catch (err) {
          console.warn('Failed to fetch from Swagger endpoint. Falling back to local endpoints.json');
          schemaUrl = '/data/endpoints.json';
          await openApiService.fetchSchema(schemaUrl);
        }

        // Convert schema to endpoints
        const apiEndpoints = openApiService.convertSchemaToEndpoints();
        setEndpoints(apiEndpoints);

        // Show success notification
        addNotification(`Successfully loaded ${apiEndpoints.length} API endpoints from ${isCustomEnvironment ? 'Custom URL' : selectedEnvironment}`, 'success');
      } catch (error) {
        console.error('Error loading API schema:', error);
        setError('Failed to load API endpoints. Please check your connection and try again.');
        addNotification(`Error: ${(error as Error).message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchApiSchema();
  }, [baseUrl, isCustomEnvironment, selectedEnvironment]);

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setApiResponse(null);
  };

  const handleApiResponse = (responseData: any) => {
    setApiResponse(responseData);
    addNotification('Request completed successfully', 'success');
  };

  const handleApiError = (error: Error) => {
    console.error('API request error:', error);
    addNotification(`Error: ${error.message}`, 'error');
  };

  const handleSelectHistoryItem = (historyItem: TestHistoryType) => {
    // Find the matching endpoint
    const endpoint = endpoints.find(e =>
      e.path === historyItem.endpoint &&
      e.method === historyItem.method
    );

    if (endpoint) {
      setSelectedEndpoint(endpoint);
      setApiResponse(historyItem.result.data);
      setActiveTab('tester');
    } else {
      addNotification(`Endpoint not found: ${historyItem.method} ${historyItem.endpoint}`, 'error');
    }
  };

  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(note => note.id !== id));
    }, 5000);
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications(prev => prev.filter(note => note.id !== id));
  };

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const envName = e.target.value;

    if (envName === 'custom') {
      setIsCustomEnvironment(true);
      setBaseUrl(customBaseUrl || '');

      // Store in localStorage
      localStorage.setItem('isCustomEnvironment', 'true');
      if (customBaseUrl) {
        localStorage.setItem('customBaseUrl', customBaseUrl);
      }
    } else {
      setIsCustomEnvironment(false);
      setSelectedEnvironment(envName);

      const env = environments.find(e => e.name === envName);
      if (env) {
        setBaseUrl(env.baseUrl);
      }

      // Store in localStorage
      localStorage.setItem('isCustomEnvironment', 'false');
      localStorage.setItem('selectedEnvironment', envName);
    }
  };

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBaseUrl = e.target.value;
    setCustomBaseUrl(newBaseUrl);

    if (isCustomEnvironment) {
      setBaseUrl(newBaseUrl);
      localStorage.setItem('customBaseUrl', newBaseUrl);
    }
  };

  const handleAddEnvironment = () => {
    if (!customBaseUrl.trim()) {
      addNotification('Please enter a valid URL', 'error');
      return;
    }

    const envName = prompt('Enter a name for this environment:');
    if (!envName) return;

    if (environments.some(env => env.name === envName)) {
      addNotification(`Environment "${envName}" already exists`, 'error');
      return;
    }

    const newEnvironment: Environment = {
      name: envName,
      baseUrl: customBaseUrl,
    };

    const updatedEnvironments = [...environments, newEnvironment];
    setEnvironments(updatedEnvironments);
    setSelectedEnvironment(envName);
    setIsCustomEnvironment(false);
    setBaseUrl(customBaseUrl);

    // Store in localStorage
    localStorage.setItem('apiEnvironments', JSON.stringify(updatedEnvironments));
    localStorage.setItem('selectedEnvironment', envName);
    localStorage.setItem('isCustomEnvironment', 'false');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center px-5 py-4 bg-blue-500 text-white shadow-md">
        <h1 className="text-xl font-bold m-0">API Tester</h1>
        <div className="flex items-center gap-2.5">
          <select
            value={isCustomEnvironment ? 'custom' : selectedEnvironment}
            onChange={handleEnvironmentChange}
            className="px-3 py-2 rounded border-none"
          >
            <optgroup label="Environments">
              {environments.map(env => (
                <option key={env.name} value={env.name}>
                  {env.name}
                </option>
              ))}
            </optgroup>
            <option value="custom">Custom URL</option>
          </select>

          {isCustomEnvironment && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customBaseUrl}
                onChange={handleCustomUrlChange}
                placeholder="Enter custom base URL"
                className="px-3 py-2 rounded border-none w-[300px]"
              />
              <button
                onClick={handleAddEnvironment}
                className="px-3 py-2 bg-blue-600 text-white rounded border-none cursor-pointer text-sm hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          )}

          <div className="ml-4 bg-blue-600 px-3 py-1 rounded text-xs">
            {isCustomEnvironment ? 'Custom URL' : selectedEnvironment}
          </div>
        </div>
      </header>

      <Notifications
        notifications={notifications}
        onRemove={handleRemoveNotification}
      />

      <div className="flex bg-gray-100 border-b border-gray-300">
        <button
          className={`px-6 py-3 border-none bg-transparent text-base cursor-pointer border-b-[3px] border-transparent transition-all ${
            activeTab === 'tester' ? 'border-b-blue-500 font-bold' : ''
          }`}
          onClick={() => setActiveTab('tester')}
        >
          API Tester
        </button>
        <button
          className={`px-6 py-3 border-none bg-transparent text-base cursor-pointer border-b-[3px] border-transparent transition-all ${
            activeTab === 'scenarios' ? 'border-b-blue-500 font-bold' : ''
          }`}
          onClick={() => setActiveTab('scenarios')}
        >
          Scenario Builder
        </button>
        <button
          className={`px-6 py-3 border-none bg-transparent text-base cursor-pointer border-b-[3px] border-transparent transition-all ${
            activeTab === 'history' ? 'border-b-blue-500 font-bold' : ''
          }`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full p-5 text-center">
            <div className="w-9 h-9 border-4 border-gray-200 border-l-blue-500 rounded-full animate-spin mb-4"></div>
            <p>Loading API endpoints...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full w-full p-5 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : activeTab === 'tester' ? (
          <>
            <div className="w-[300px] border-r border-gray-300 h-full overflow-hidden">
              <EndpointList
                endpoints={endpoints}
                onSelectEndpoint={handleEndpointSelect}
                selectedEndpoint={selectedEndpoint}
              />
            </div>

            <div className="flex-1 border-r border-gray-300 h-full overflow-hidden">
              {selectedEndpoint ? (
                <ApiTester
                  endpoint={selectedEndpoint}
                  baseUrl={baseUrl}
                  onResponse={handleApiResponse}
                  onError={handleApiError}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-gray-500 text-base text-center p-0 5">
                  <p>Select an endpoint from the list to get started</p>
                </div>
              )}
            </div>

            <div className="w-[400px] h-full overflow-hidden">
              <ResponseViewer response={apiResponse} />
            </div>
          </>
        ) : activeTab === 'scenarios' ? (
          <ScenarioBuilder
            endpoints={endpoints}
            baseUrl={baseUrl}
          />
        ) : (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <TestHistory onSelectHistoryItem={handleSelectHistoryItem} />
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 px-5 bg-gray-100 text-center text-gray-500 border-t border-gray-300 text-sm">
        <p>AI Fight Club API Tester • Connected to: {isCustomEnvironment ? customBaseUrl : baseUrl}</p>
      </footer>
    </div>
  );
}

export default App;
