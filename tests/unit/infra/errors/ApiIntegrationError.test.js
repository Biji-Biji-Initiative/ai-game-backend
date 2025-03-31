import { expect } from 'chai';
import { describe, it } from 'mocha';
import { 
  ApiIntegrationError,
  OpenAIError
} from "@/core/infra/errors/ApiIntegrationError.js";
import { InfraError } from "@/core/infra/errors/InfraErrors.js";

describe('API Integration Errors', () => {
  describe('ApiIntegrationError', () => {
    it('should create a basic API integration error with minimal context', () => {
      const error = new ApiIntegrationError('API call failed');
      
      expect(error).to.be.instanceof(InfraError);
      expect(error.name).to.equal('ApiIntegrationError');
      expect(error.message).to.equal('API call failed');
      expect(error.component).to.equal('api');
      expect(error.metadata).to.be.an('object');
    });
    
    it('should capture API-specific context', () => {
      const originalError = new Error('Connection refused');
      originalError.status = 503;
      
      const error = new ApiIntegrationError('External API unavailable', {
        cause: originalError,
        serviceName: 'payment-gateway',
        endpoint: '/v1/payments',
        method: 'POST',
        statusCode: 503,
        requestId: 'req_12345',
        responseData: { error: 'Service unavailable' }
      });
      
      expect(error.cause).to.equal(originalError);
      expect(error.serviceName).to.equal('payment-gateway');
      expect(error.endpoint).to.equal('/v1/payments');
      expect(error.method).to.equal('POST');
      expect(error.statusCode).to.equal(503);
      expect(error.requestId).to.equal('req_12345');
      expect(error.responseData).to.deep.equal({ error: 'Service unavailable' });
      
      // Check metadata includes the API-specific context
      expect(error.metadata).to.include.keys([
        'serviceName', 
        'endpoint', 
        'method', 
        'statusCode', 
        'requestId', 
        'responseData'
      ]);
    });
    
    it('should properly serialize to JSON for logging', () => {
      const error = new ApiIntegrationError('API call failed', {
        serviceName: 'payment-gateway',
        endpoint: '/v1/payments',
        method: 'POST',
        statusCode: 400,
        requestId: 'req_12345',
        responseData: { code: 'INVALID_CARD' }
      });
      
      const json = error.toJSON();
      
      expect(json).to.have.property('name', 'ApiIntegrationError');
      expect(json).to.have.property('message', 'API call failed');
      expect(json).to.have.property('component', 'api');
      expect(json.metadata).to.have.property('serviceName', 'payment-gateway');
      expect(json.metadata).to.have.property('endpoint', '/v1/payments');
      expect(json.metadata).to.have.property('method', 'POST');
      expect(json.metadata).to.have.property('statusCode', 400);
      expect(json.metadata).to.have.property('requestId', 'req_12345');
      expect(json.metadata).to.have.deep.property('responseData', { code: 'INVALID_CARD' });
    });
  });
  
  describe('OpenAIError', () => {
    it('should create an OpenAI-specific error with default service name', () => {
      const error = new OpenAIError('OpenAI API request failed');
      
      expect(error).to.be.instanceof(ApiIntegrationError);
      expect(error.name).to.equal('OpenAIError');
      expect(error.serviceName).to.equal('openai');
    });
    
    it('should capture OpenAI-specific context', () => {
      const originalError = new Error('Rate limit exceeded');
      originalError.status = 429;
      
      const error = new OpenAIError('OpenAI rate limit exceeded', {
        cause: originalError,
        endpoint: '/v1/chat/completions',
        method: 'POST',
        statusCode: 429,
        requestId: 'req_12345',
        model: 'gpt-4-turbo',
        prompt: 'Explain quantum computing in simple terms'
      });
      
      expect(error.serviceName).to.equal('openai');
      expect(error.endpoint).to.equal('/v1/chat/completions');
      expect(error.method).to.equal('POST');
      expect(error.statusCode).to.equal(429);
      expect(error.requestId).to.equal('req_12345');
      expect(error.model).to.equal('gpt-4-turbo');
      expect(error.prompt).to.equal('Explain quantum computing in simple terms');
      
      // Check metadata includes OpenAI-specific fields
      expect(error.metadata).to.have.property('model', 'gpt-4-turbo');
      expect(error.metadata).to.have.property('promptLength', 42);
    });
  });
}); 