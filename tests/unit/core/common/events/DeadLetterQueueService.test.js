import { expect } from 'chai';
import sinon from 'sinon';
import { deadLetterQueueService } from '../../../../../src/core/common/events/DeadLetterQueueService.js';

describe('DeadLetterQueueService', () => {
  let mockDb;
  let mockLoggerStub;
  
  beforeEach(() => {
    // Mock the database client
    mockDb = {
      from: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      insert: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      delete: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      order: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      range: sinon.stub().returnsThis(),
      single: sinon.stub().returns({ data: { id: 'test-id' }, error: null })
    };
    
    // Mock the logger
    mockLoggerStub = {
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      child: sinon.stub().returns({
        info: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
      })
    };
    
    // Replace the database client and logger with our mocks
    deadLetterQueueService.db = mockDb;
    deadLetterQueueService.logger = mockLoggerStub;
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('storeFailedEvent', () => {
    it('should store a failed event in the database', async () => {
      // Arrange
      const event = {
        id: 'test-event-id',
        name: 'TestEvent',
        data: { key: 'value' },
        correlationId: 'test-correlation-id',
        sourceId: 'test-source-id'
      };
      
      const handlerId = 'test-handler-id';
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      
      // Act
      await deadLetterQueueService.storeFailedEvent({ event, handlerId, error });
      
      // Assert
      expect(mockDb.from.calledWith('event_dead_letter_queue')).to.be.true;
      expect(mockDb.insert.calledOnce).to.be.true;
      expect(mockLoggerStub.info.calledOnce).to.be.true;
    });
    
    it('should handle database errors gracefully', async () => {
      // Arrange
      const event = { id: 'test-event-id', name: 'TestEvent' };
      const handlerId = 'test-handler-id';
      const error = new Error('Test error');
      
      // Make the database operation fail
      mockDb.single.returns({ data: null, error: new Error('Database error') });
      
      // Act
      const result = await deadLetterQueueService.storeFailedEvent({ event, handlerId, error });
      
      // Assert
      expect(result).to.be.null;
      expect(mockLoggerStub.error.calledOnce).to.be.true;
    });
  });
  
  describe('getFailedEvents', () => {
    it('should retrieve failed events with filters', async () => {
      // Arrange
      const mockEvents = [
        { id: 'event1', event_name: 'EventType1', status: 'pending' },
        { id: 'event2', event_name: 'EventType2', status: 'failed' }
      ];
      
      mockDb.select.returns({ data: mockEvents, error: null });
      
      // Act
      const result = await deadLetterQueueService.getFailedEvents({ 
        status: 'pending', 
        eventName: 'EventType1',
        limit: 10,
        offset: 0
      });
      
      // Assert
      expect(mockDb.from.calledWith('event_dead_letter_queue')).to.be.true;
      expect(mockDb.order.calledWith('created_at', { ascending: false })).to.be.true;
      expect(result).to.deep.equal(mockEvents);
    });
    
    it('should handle database errors when retrieving events', async () => {
      // Arrange
      mockDb.select.returns({ data: null, error: new Error('Database error') });
      
      // Act
      const result = await deadLetterQueueService.getFailedEvents();
      
      // Assert
      expect(result).to.be.an('array').that.is.empty;
      expect(mockLoggerStub.error.calledOnce).to.be.true;
    });
  });
  
  describe('retryEvent', () => {
    it('should retry a failed event successfully', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      const mockDlqEntry = {
        id: dlqEntryId,
        event_id: 'test-event-id',
        event_name: 'TestEvent',
        event_data: { key: 'value' },
        handler_id: 'test-handler-id',
        error_message: 'Original error',
        retry_count: 0,
        status: 'pending',
        correlation_id: 'test-correlation-id',
        source_id: 'test-source-id'
      };
      
      // Mock the database responses
      mockDb.select.returns({ data: mockDlqEntry, error: null });
      mockDb.update.returns({ error: null });
      
      // Mock the event bus
      const mockEventBus = {
        publish: sinon.stub().resolves()
      };
      
      // Act
      const result = await deadLetterQueueService.retryEvent(dlqEntryId, mockEventBus);
      
      // Assert
      expect(result).to.be.true;
      expect(mockEventBus.publish.calledOnce).to.be.true;
      expect(mockEventBus.publish.calledWith(mockDlqEntry.event_name, mockDlqEntry.event_data)).to.be.true;
      expect(mockDb.update.calledTwice).to.be.true; // Once for retrying, once for resolving
    });
    
    it('should handle retry failures', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      const mockDlqEntry = {
        id: dlqEntryId,
        event_id: 'test-event-id',
        event_name: 'TestEvent',
        event_data: { key: 'value' }
      };
      
      // Mock the database responses
      mockDb.select.returns({ data: mockDlqEntry, error: null });
      mockDb.update.returns({ error: null });
      
      // Mock a failing event bus
      const mockEventBus = {
        publish: sinon.stub().rejects(new Error('Retry failed'))
      };
      
      // Act
      const result = await deadLetterQueueService.retryEvent(dlqEntryId, mockEventBus);
      
      // Assert
      expect(result).to.be.false;
      expect(mockEventBus.publish.calledOnce).to.be.true;
      expect(mockDb.update.calledTwice).to.be.true; // Once for retrying, once for updating with failure
      expect(mockLoggerStub.error.calledOnce).to.be.true;
    });
  });
  
  describe('resolveEntry', () => {
    it('should mark an entry as resolved', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      mockDb.update.returns({ error: null });
      
      // Act
      const result = await deadLetterQueueService.resolveEntry(dlqEntryId);
      
      // Assert
      expect(result).to.be.true;
      expect(mockDb.from.calledWith('event_dead_letter_queue')).to.be.true;
      expect(mockDb.update.calledWith({ status: 'resolved' })).to.be.true;
      expect(mockDb.eq.calledWith('id', dlqEntryId)).to.be.true;
      expect(mockLoggerStub.info.calledOnce).to.be.true;
    });
    
    it('should handle database errors when resolving', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      mockDb.update.returns({ error: new Error('Database error') });
      
      // Act
      const result = await deadLetterQueueService.resolveEntry(dlqEntryId);
      
      // Assert
      expect(result).to.be.false;
      expect(mockLoggerStub.error.calledOnce).to.be.true;
    });
  });
  
  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      mockDb.delete.returns({ error: null });
      
      // Act
      const result = await deadLetterQueueService.deleteEntry(dlqEntryId);
      
      // Assert
      expect(result).to.be.true;
      expect(mockDb.from.calledWith('event_dead_letter_queue')).to.be.true;
      expect(mockDb.delete.calledOnce).to.be.true;
      expect(mockDb.eq.calledWith('id', dlqEntryId)).to.be.true;
      expect(mockLoggerStub.info.calledOnce).to.be.true;
    });
    
    it('should handle database errors when deleting', async () => {
      // Arrange
      const dlqEntryId = 'test-dlq-id';
      mockDb.delete.returns({ error: new Error('Database error') });
      
      // Act
      const result = await deadLetterQueueService.deleteEntry(dlqEntryId);
      
      // Assert
      expect(result).to.be.false;
      expect(mockLoggerStub.error.calledOnce).to.be.true;
    });
  });
}); 