import { expect } from 'chai';
import sinon from 'sinon';
import { createValidationMiddleware } from '../../../../../../src/core/infra/http/middleware/validationFactory.js';
import * as validationModule from '../../../../../../src/core/infra/http/middleware/validation.js';
import { z } from 'zod';

describe('Validation Factory', () => {
  let validateBodyStub, validateQueryStub, validateParamsStub;
  
  beforeEach(() => {
    // Create stubs for validation functions
    validateBodyStub = sinon.stub().returns(() => {});
    validateQueryStub = sinon.stub().returns(() => {});
    validateParamsStub = sinon.stub().returns(() => {});
    
    // Replace the real implementations with stubs
    sinon.replace(validationModule, 'validateBody', validateBodyStub);
    sinon.replace(validationModule, 'validateQuery', validateQueryStub);
    sinon.replace(validationModule, 'validateParams', validateParamsStub);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should return an empty array when no schemas provided', () => {
    // Act
    const middleware = createValidationMiddleware();
    
    // Assert
    expect(middleware).to.be.an('array');
    expect(middleware).to.have.lengthOf(0);
    expect(validateBodyStub.called).to.be.false;
    expect(validateQueryStub.called).to.be.false;
    expect(validateParamsStub.called).to.be.false;
  });
  
  it('should create body validation middleware when body schema provided', () => {
    // Arrange
    const bodySchema = z.object({ name: z.string() });
    
    // Act
    const middleware = createValidationMiddleware({ body: bodySchema });
    
    // Assert
    expect(middleware).to.be.an('array');
    expect(middleware).to.have.lengthOf(1);
    expect(validateBodyStub.calledOnce).to.be.true;
    expect(validateBodyStub.calledWith(bodySchema)).to.be.true;
  });
  
  it('should create query validation middleware when query schema provided', () => {
    // Arrange
    const querySchema = z.object({ page: z.number() });
    
    // Act
    const middleware = createValidationMiddleware({ query: querySchema });
    
    // Assert
    expect(middleware).to.be.an('array');
    expect(middleware).to.have.lengthOf(1);
    expect(validateQueryStub.calledOnce).to.be.true;
    expect(validateQueryStub.calledWith(querySchema)).to.be.true;
  });
  
  it('should create params validation middleware when params schema provided', () => {
    // Arrange
    const paramsSchema = z.object({ id: z.string() });
    
    // Act
    const middleware = createValidationMiddleware({ params: paramsSchema });
    
    // Assert
    expect(middleware).to.be.an('array');
    expect(middleware).to.have.lengthOf(1);
    expect(validateParamsStub.calledOnce).to.be.true;
    expect(validateParamsStub.calledWith(paramsSchema)).to.be.true;
  });
  
  it('should create multiple middleware functions when multiple schemas provided', () => {
    // Arrange
    const bodySchema = z.object({ name: z.string() });
    const querySchema = z.object({ page: z.number() });
    const paramsSchema = z.object({ id: z.string() });
    
    // Act
    const middleware = createValidationMiddleware({
      body: bodySchema,
      query: querySchema,
      params: paramsSchema
    });
    
    // Assert
    expect(middleware).to.be.an('array');
    expect(middleware).to.have.lengthOf(3);
    expect(validateBodyStub.calledOnce).to.be.true;
    expect(validateQueryStub.calledOnce).to.be.true;
    expect(validateParamsStub.calledOnce).to.be.true;
    expect(validateBodyStub.calledWith(bodySchema)).to.be.true;
    expect(validateQueryStub.calledWith(querySchema)).to.be.true;
    expect(validateParamsStub.calledWith(paramsSchema)).to.be.true;
  });
}); 