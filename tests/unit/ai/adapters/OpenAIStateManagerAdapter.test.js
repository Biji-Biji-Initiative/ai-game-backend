import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import OpenAIStateManagerAdapter from "../../../../src/core/ai/adapters/OpenAIStateManagerAdapter.js";
import AIStateManager from "../../../../src/core/ai/ports/AIStateManager.js";
'use strict';
/**
 * Unit Tests for OpenAIStateManagerAdapter
 *
 * These tests verify that the OpenAIStateManagerAdapter correctly implements
 * the AIStateManager port interface and properly delegates to the OpenAI state manager.
 */
describe('OpenAIStateManagerAdapter', () => {
    let openAIStateManagerAdapter;
    let mockOpenAIStateManager;
    let mockLogger;
    beforeEach(() => {
        // Create mocks
        mockOpenAIStateManager = {
            findOrCreateConversationState: sinon.stub().resolves({ id: 'state_123', userId: 'user_abc', context: 'test_context' }),
            getLastResponseId: sinon.stub().resolves('resp_456'),
            updateLastResponseId: sinon.stub().resolves({ id: 'state_123', lastResponseId: 'resp_789' })
        };
        mockLogger = {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
        // Create adapter with mocks
        openAIStateManagerAdapter = new OpenAIStateManagerAdapter({
            openAIStateManager: mockOpenAIStateManager,
            logger: mockLogger
        });
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('Interface Implementation', () => {
        it('should be an instance of AIStateManager', () => {
            expect(openAIStateManagerAdapter).to.be.instanceof(AIStateManager);
        });
        it('should implement all AIStateManager methods', () => {
            expect(openAIStateManagerAdapter.findOrCreateConversationState).to.be.a('function');
            expect(openAIStateManagerAdapter.getLastResponseId).to.be.a('function');
            expect(openAIStateManagerAdapter.updateLastResponseId).to.be.a('function');
        });
    });
    describe('Constructor', () => {
        it('should throw error if openAIStateManager is not provided', () => {
            expect(() => new OpenAIStateManagerAdapter({ logger: mockLogger }))
                .to.throw('OpenAI state manager is required');
        });
        it('should not throw if logger is not provided', () => {
            expect(() => new OpenAIStateManagerAdapter({ openAIStateManager: mockOpenAIStateManager }))
                .not.to.throw();
        });
    });
    describe('findOrCreateConversationState', () => {
        it('should delegate to openAIStateManager.findOrCreateConversationState with the same parameters', async () => {
            const userId = 'user_123';
            const context = 'chat_context';
            const metadata = { key: 'value' };
            const result = await openAIStateManagerAdapter.findOrCreateConversationState(userId, context, metadata);
            expect(mockOpenAIStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(mockOpenAIStateManager.findOrCreateConversationState.calledWith(userId, context, metadata)).to.be.true;
            expect(result).to.deep.equal({
                id: 'state_123',
                userId: 'user_abc',
                context: 'test_context'
            });
        });
        it('should log debug message when called', async () => {
            await openAIStateManagerAdapter.findOrCreateConversationState('user_123', 'context');
            expect(mockLogger.debug.calledOnce).to.be.true;
            expect(mockLogger.debug.firstCall.args[0]).to.include('Finding or creating conversation state');
        });
    });
    describe('getLastResponseId', () => {
        it('should delegate to openAIStateManager.getLastResponseId with the same parameters', async () => {
            const stateId = 'state_123';
            const result = await openAIStateManagerAdapter.getLastResponseId(stateId);
            expect(mockOpenAIStateManager.getLastResponseId.calledOnce).to.be.true;
            expect(mockOpenAIStateManager.getLastResponseId.calledWith(stateId)).to.be.true;
            expect(result).to.equal('resp_456');
        });
        it('should log debug message when called', async () => {
            await openAIStateManagerAdapter.getLastResponseId('state_123');
            expect(mockLogger.debug.calledOnce).to.be.true;
            expect(mockLogger.debug.firstCall.args[0]).to.include('Getting last response ID');
        });
    });
    describe('updateLastResponseId', () => {
        it('should delegate to openAIStateManager.updateLastResponseId with the same parameters', async () => {
            const stateId = 'state_123';
            const responseId = 'resp_789';
            const result = await openAIStateManagerAdapter.updateLastResponseId(stateId, responseId);
            expect(mockOpenAIStateManager.updateLastResponseId.calledOnce).to.be.true;
            expect(mockOpenAIStateManager.updateLastResponseId.calledWith(stateId, responseId)).to.be.true;
            expect(result).to.deep.equal({
                id: 'state_123',
                lastResponseId: 'resp_789'
            });
        });
        it('should log debug message when called', async () => {
            await openAIStateManagerAdapter.updateLastResponseId('state_123', 'resp_789');
            expect(mockLogger.debug.calledOnce).to.be.true;
            expect(mockLogger.debug.firstCall.args[0]).to.include('Updating last response ID');
        });
    });
});
