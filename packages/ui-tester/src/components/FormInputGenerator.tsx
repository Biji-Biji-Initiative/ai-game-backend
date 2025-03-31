import React, { useState, useEffect } from 'react';
import { ApiEndpoint, ApiParameter } from '../types/api';
import { OpenApiService } from '../services/OpenApiService';

export interface PathParam {
  name: string;
  value: string;
}

export interface QueryParam {
  name: string;
  value: string;
}

interface FormInputGeneratorProps {
  endpoint: ApiEndpoint;
  onSubmit: (pathParams: PathParam[], queryParams: QueryParam[], body: any) => void;
}

const FormInputGenerator: React.FC<FormInputGeneratorProps> = ({ endpoint, onSubmit }) => {
  // Extract path parameter names from the path
  const pathParamNames = endpoint.path.match(/\{([^}]+)\}/g)?.map(param => param.substring(1, param.length - 1)) || [];

  // Initialize path parameters
  const [pathParams, setPathParams] = useState<PathParam[]>(
    pathParamNames.map(name => ({
      name,
      value: ''
    }))
  );

  // Filter query parameters from the endpoint parameters
  const queryParamDefs = endpoint.parameters.filter(param => param.schema && param.schema.type !== 'path');

  // Initialize query parameters
  const [queryParams, setQueryParams] = useState<QueryParam[]>(
    queryParamDefs.map(param => ({
      name: param.name,
      value: ''
    }))
  );

  // Initialize request body
  const [requestBody, setRequestBody] = useState<string>('');
  // Track whether the user has modified the request body
  const [bodyModified, setBodyModified] = useState<boolean>(false);

  // Generate example JSON for request body
  useEffect(() => {
    if (endpoint.requestBody && !bodyModified) {
      try {
        const schema = endpoint.requestBody.content['application/json']?.schema;
        if (schema) {
          const example = OpenApiService.getExampleValue(schema);
          setRequestBody(JSON.stringify(example, null, 2));
        }
      } catch (error) {
        console.error('Error generating example request body:', error);
        setRequestBody('{\n  \n}');
      }
    }
  }, [endpoint, bodyModified]);

  // Handle path parameter changes
  const handlePathParamChange = (index: number, value: string) => {
    const updatedParams = [...pathParams];
    updatedParams[index].value = value;
    setPathParams(updatedParams);
  };

  // Handle query parameter changes
  const handleQueryParamChange = (index: number, value: string) => {
    const updatedParams = [...queryParams];
    updatedParams[index].value = value;
    setQueryParams(updatedParams);
  };

  // Handle request body changes
  const handleRequestBodyChange = (value: string) => {
    setRequestBody(value);
    setBodyModified(true);
  };

  // Format the request body JSON
  const formatRequestBody = () => {
    try {
      if (requestBody.trim()) {
        const parsedJson = JSON.parse(requestBody);
        setRequestBody(JSON.stringify(parsedJson, null, 2));
      }
    } catch (error) {
      // If not valid JSON, don't modify
      console.error('Cannot format invalid JSON:', error);
    }
  };

  // Reset the request body to the generated example
  const resetRequestBody = () => {
    setBodyModified(false);
    try {
      const schema = endpoint.requestBody?.content['application/json']?.schema;
      if (schema) {
        const example = OpenApiService.getExampleValue(schema);
        setRequestBody(JSON.stringify(example, null, 2));
      }
    } catch (error) {
      console.error('Error resetting request body:', error);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse request body JSON
    let parsedBody: any = null;
    try {
      if (requestBody.trim()) {
        parsedBody = JSON.parse(requestBody);
      }
    } catch (error) {
      alert('Invalid JSON in request body. Please correct it before submitting.');
      return;
    }

    // Call the onSubmit callback with the parameters
    onSubmit(pathParams, queryParams, parsedBody);
  };

  // Get label with required indicator
  const renderLabel = (name: string, required: boolean, description?: string) => (
    <label className="block mb-1 font-medium text-sm">
      {name}
      {required && <span className="text-red-500 ml-1">*</span>}:
      {description && (
        <span className="ml-2 text-xs text-gray-500 italic">{description}</span>
      )}
    </label>
  );

  // Render input field based on parameter schema
  const renderInputField = (
    param: ApiParameter,
    value: string,
    onChange: (value: string) => void
  ) => {
    const schema = param.schema;
    const isRequired = param.required;

    // Handle enum types (dropdown selection)
    if (schema.enum && schema.enum.length > 0) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={isRequired}
          className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">-- Select {param.name} --</option>
          {schema.enum.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // Handle different types based on schema.type
    switch (schema.type) {
      case 'integer':
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.description || `Enter ${param.name}`}
            required={isRequired}
            step={schema.type === 'integer' ? "1" : "any"}
            min={schema.minimum !== undefined ? schema.minimum : undefined}
            max={schema.maximum !== undefined ? schema.maximum : undefined}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value === 'true'}
                onChange={() => onChange('true')}
                name={`param-${param.name}`}
                className="w-4 h-4"
              />
              <span className="text-sm">True</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value === 'false'}
                onChange={() => onChange('false')}
                name={`param-${param.name}`}
                className="w-4 h-4"
              />
              <span className="text-sm">False</span>
            </label>
            {!value && isRequired && (
              <span className="text-xs text-red-500">Required</span>
            )}
          </div>
        );

      case 'array':
        return (
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Comma-separated values, e.g: value1,value2,value3"
              required={isRequired}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="text-xs mt-1 text-gray-500">
              Format: comma-separated values
            </div>
          </div>
        );

      // Default to string input
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.description || `Enter ${param.name}`}
            required={isRequired}
            pattern={schema.pattern}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Path Parameters Section */}
      {pathParams.length > 0 && (
        <div className="bg-white rounded p-4 border border-gray-200">
          <h4 className="text-sm font-semibold mb-4 text-gray-700">Path Parameters</h4>

          {pathParams.map((param, index) => {
            // Find parameter definition for additional info
            const paramDef = endpoint.parameters.find(p => p.name === param.name);

            return (
              <div key={index} className="mb-4 last:mb-0">
                {renderLabel(
                  param.name,
                  paramDef?.required || false,
                  paramDef?.description
                )}
                {renderInputField(
                  paramDef || {
                    name: param.name,
                    required: true,
                    description: '',
                    schema: { type: 'string' }
                  },
                  param.value,
                  (value) => handlePathParamChange(index, value)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Query Parameters Section */}
      {queryParams.length > 0 && (
        <div className="bg-white rounded p-4 border border-gray-200">
          <h4 className="text-sm font-semibold mb-4 text-gray-700">Query Parameters</h4>

          {queryParams.map((param, index) => {
            // Find parameter definition
            const paramDef = queryParamDefs.find(p => p.name === param.name);

            if (!paramDef) return null;

            return (
              <div key={index} className="mb-4 last:mb-0">
                {renderLabel(
                  param.name,
                  paramDef.required,
                  paramDef.description
                )}
                {renderInputField(
                  paramDef,
                  param.value,
                  (value) => handleQueryParamChange(index, value)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Request Body Section */}
      {endpoint.requestBody && (
        <div className="bg-white rounded p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Request Body
              {endpoint.requestBody.required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={formatRequestBody}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
              >
                Format JSON
              </button>
              <button
                type="button"
                onClick={resetRequestBody}
                className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
              >
                Reset Example
              </button>
            </div>
          </div>

          {endpoint.requestBody.content['application/json']?.schema?.description && (
            <div className="text-xs italic text-gray-500 mb-2">
              {endpoint.requestBody.content['application/json'].schema.description}
            </div>
          )}

          <div className="mb-2">
            <textarea
              value={requestBody}
              onChange={(e) => handleRequestBodyChange(e.target.value)}
              rows={10}
              required={endpoint.requestBody.required}
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm resize-y focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Schema Properties Overview */}
          {endpoint.requestBody.content['application/json']?.schema?.properties && (
            <div className="mt-4">
              <h5 className="text-xs font-semibold mb-2">Schema Properties:</h5>
              <div className="text-xs border border-gray-200 rounded overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Property</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(endpoint.requestBody.content['application/json'].schema.properties).map(([key, prop]: [string, any]) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold">{key}</td>
                        <td className="px-3 py-2">{prop.type || 'object'}</td>
                        <td className="px-3 py-2">{prop.description || '-'}</td>
                        <td className="px-3 py-2">
                          {endpoint.requestBody.content['application/json'].schema.required?.includes(key) ? (
                            <span className="text-red-500">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        className="self-end px-5 py-2 bg-blue-500 text-white rounded font-medium text-sm cursor-pointer transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-200 disabled:cursor-not-allowed"
      >
        Send Request
      </button>
    </form>
  );
};

export default FormInputGenerator;
