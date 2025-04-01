import { jest } from '@jest/globals';
import Entity from "@/core/common/models/Entity.js";

describe('Entity', () => {
  describe('constructor', () => {
    it('should initialize with provided ID', () => {
      const id = 'test-id-123';
      const entity = new Entity(id);
      
      expect(entity.id).toBe(id);
    });
    
    it('should generate UUID if ID not provided', () => {
      const entity = new Entity();
      
      expect(entity.id).toBeDefined();
      expect(typeof entity.id).toBe('string');
      expect(entity.id.length).toBeGreaterThan(0);
    });
    
    it('should initialize empty domain events array', () => {
      const entity = new Entity();
      
      expect(entity._domainEvents).toEqual([]);
    });
  });
  
  describe('addDomainEvent', () => {
    it('should add event to domain events with correct structure', () => {
      const entity = new Entity('123');
      const eventType = 'TEST_EVENT';
      const eventData = { key: 'value' };
      
      const event = entity.addDomainEvent(eventType, eventData);
      
      expect(entity._domainEvents).toHaveLength(1);
      expect(entity._domainEvents[0]).toBe(event);
      expect(event).toEqual({
        type: eventType,
        data: {
          ...eventData,
          entityId: entity.id,
          entityType: 'Entity',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.stringContaining(entity.id)
        })
      });
    });
    
    it('should throw error if eventType is not provided', () => {
      const entity = new Entity();
      
      expect(() => entity.addDomainEvent()).toThrow('Event type is required');
    });
    
    it('should use empty object as default for eventData', () => {
      const entity = new Entity('123');
      const eventType = 'TEST_EVENT';
      
      const event = entity.addDomainEvent(eventType);
      
      expect(event.data).toEqual({
        entityId: entity.id,
        entityType: 'Entity',
      });
    });
    
    it('should include timestamp in ISO format', () => {
      const entity = new Entity('123');
      
      const event = entity.addDomainEvent('TEST_EVENT');
      
      // Validate ISO 8601 timestamp format
      expect(new Date(event.metadata.timestamp).toISOString()).toBe(event.metadata.timestamp);
    });
    
    it('should include correlationId with entityName, id and timestamp', () => {
      const entity = new Entity('test-id-123');
      
      const event = entity.addDomainEvent('TEST_EVENT');
      
      expect(event.metadata.correlationId).toContain('entity-test-id-123');
      expect(event.metadata.correlationId.split('-').length).toBeGreaterThan(3);
    });
  });
  
  describe('getDomainEvents', () => {
    it('should return copy of domain events array', () => {
      const entity = new Entity();
      entity.addDomainEvent('EVENT1');
      entity.addDomainEvent('EVENT2');
      
      const events = entity.getDomainEvents();
      
      expect(events).toHaveLength(2);
      expect(events).not.toBe(entity._domainEvents); // Should be a different array reference
      expect(events).toEqual(entity._domainEvents); // But with same content
    });
    
    it('should return empty array when no events', () => {
      const entity = new Entity();
      
      const events = entity.getDomainEvents();
      
      expect(events).toEqual([]);
    });
  });
  
  describe('clearDomainEvents', () => {
    it('should clear all domain events', () => {
      const entity = new Entity();
      entity.addDomainEvent('EVENT1');
      entity.addDomainEvent('EVENT2');
      
      entity.clearDomainEvents();
      
      expect(entity._domainEvents).toEqual([]);
    });
  });
  
  describe('hasDomainEvents', () => {
    it('should return true when events exist', () => {
      const entity = new Entity();
      entity.addDomainEvent('EVENT1');
      
      expect(entity.hasDomainEvents()).toBe(true);
    });
    
    it('should return false when no events exist', () => {
      const entity = new Entity();
      
      expect(entity.hasDomainEvents()).toBe(false);
    });
    
    it('should return false after events are cleared', () => {
      const entity = new Entity();
      entity.addDomainEvent('EVENT1');
      entity.clearDomainEvents();
      
      expect(entity.hasDomainEvents()).toBe(false);
    });
  });
  
  describe('generateId', () => {
    it('should return a string', () => {
      const id = Entity.generateId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
    
    it('should return unique values on successive calls', () => {
      const id1 = Entity.generateId();
      const id2 = Entity.generateId();
      
      expect(id1).not.toBe(id2);
    });
  });
}); 