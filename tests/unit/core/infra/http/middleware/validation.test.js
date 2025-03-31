import { expect } from 'chai';
import sinon from 'sinon';
import { validateBody, validateQuery, validateParams } from "@/core/infra/http/middleware/validation.js";
import { z } from 'zod';
import { AppError } from "@/core/infra/errors/AppError.js";

describe('Validation Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      method: 'GET'
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    next = sinon.stub();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('validateBody', () => {
    it('should pass validation when schema matches', () => {
      // Arrange
      const schema = z.object({
        name: z.string()
      });
      
      req.body = { name: 'Test User' };
      
      // Act
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed
    });
    
    it('should transform data according to schema', () => {
      // Arrange
      const schema = z.object({
        age: z.string().transform(val => parseInt(val, 10))
      });
      
      req.body = { age: '25' };
      
      // Act
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      // Assert
      expect(req.body.age).to.equal(25);
      expect(next.calledOnce).to.be.true;
    });
    
    it('should return validation error when schema fails', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email()
      });
      
      req.body = { email: 'not-an-email' };
      
      // Act
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('email');
    });
    
    it('should handle missing required fields', () => {
      // Arrange
      const schema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      req.body = { username: 'testuser' }; // missing password
      
      // Act
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('password');
    });
    
    it('should reject additional properties when schema is strict', () => {
      // Arrange
      const schema = z.object({
        name: z.string()
      }).strict();
      
      req.body = { 
        name: 'Test User',
        extraField: 'should not be here'
      };
      
      // Act
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('extraField');
    });
  });
  
  describe('validateQuery', () => {
    it('should pass validation when schema matches', () => {
      // Arrange
      const schema = z.object({
        page: z.string()
      });
      
      req.query = { page: '1' };
      
      // Act
      const middleware = validateQuery(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed
    });
    
    it('should transform query parameters', () => {
      // Arrange
      const schema = z.object({
        page: z.string().transform(val => parseInt(val, 10)),
        active: z.enum(['true', 'false']).transform(val => val === 'true')
      });
      
      req.query = { page: '5', active: 'true' };
      
      // Act
      const middleware = validateQuery(schema);
      middleware(req, res, next);
      
      // Assert
      expect(req.query.page).to.equal(5);
      expect(req.query.active).to.equal(true);
      expect(next.calledOnce).to.be.true;
    });
    
    it('should return validation error when query param fails validation', () => {
      // Arrange
      const schema = z.object({
        limit: z.number().int().positive()
      });
      
      req.query = { limit: -5 }; // negative number, fails validation
      
      // Act
      const middleware = validateQuery(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('limit');
    });
  });
  
  describe('validateParams', () => {
    it('should pass validation when schema matches', () => {
      // Arrange
      const schema = z.object({
        id: z.string().uuid()
      });
      
      req.params = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Valid UUID
      
      // Act
      const middleware = validateParams(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed
    });
    
    it('should transform URL parameters', () => {
      // Arrange
      const schema = z.object({
        id: z.string().transform(val => val.toUpperCase())
      });
      
      req.params = { id: 'abc123' };
      
      // Act
      const middleware = validateParams(schema);
      middleware(req, res, next);
      
      // Assert
      expect(req.params.id).to.equal('ABC123');
      expect(next.calledOnce).to.be.true;
    });
    
    it('should return validation error when URL param fails validation', () => {
      // Arrange
      const schema = z.object({
        id: z.string().uuid()
      });
      
      req.params = { id: 'not-a-uuid' };
      
      // Act
      const middleware = validateParams(schema);
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('id');
    });
  });
}); 