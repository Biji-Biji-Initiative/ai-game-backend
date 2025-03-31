import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import OpenAIClientAdapter from "@src/core/ai/adapters/OpenAIClientAdapter.js";
import AIClient from "@src/core/ai/ports/AIClient.js";
'use strict';
/**
 * Unit Tests for OpenAIClientAdapter
 *
 * These tests verify that the OpenAIClientAdapter correctly implements
 * the AIClient port interface and properly delegates to the OpenAI client.
 */
describe('OpenAIClientAdapter', () => {
    let openAIClientAdapter;
    let mockOpenAIClient;
    let mockLogger;
    beforeEach(() => {
        // Create mocks
        mockOpenAIClient = {
            sendJsonMessage: sinon.stub().resolves({ data: { result: 'success' }, responseId: 'resp_123' }),
            streamMessage: sinon.stub().resolves()
        };
        mockLogger = {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
        // Create adapter with mocks
        openAIClientAdapter = new OpenAIClientAdapter({
            openAIClient: mockOpenAIClient,
            logger: mockLogger
        });
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('Interface Implementation', () => {
        it('should be an instance of AIClient', () => {
            expect(openAIClientAdapter).to.be.instanceof(AIClient);
        });
        it('should implement all AIClient methods', () => {
            expect(openAIClientAdapter.sendJsonMessage).to.be.a('function');
            expect(openAIClientAdapter.streamMessage).to.be.a('function');
        });
    });
    describe('Constructor', () => {
        it('should throw error if openAIClient is not provided', () => {
            expect(() => new OpenAIClientAdapter({ logger: mockLogger }))
                .to.throw('OpenAI client is required');
        });
        it('should not throw if logger is not provided', () => {
            expect(() => new OpenAIClientAdapter({ openAIClient: mockOpenAIClient }))
                .not.to.throw();
        });
    });
    describe('sendJsonMessage', () => {
        it('should delegate to openAIClient.sendJsonMessage with the same parameters', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const options = { model: 'gpt-4', temperature: 0.7 };
            const result = await openAIClientAdapter.sendJsonMessage(messages, options);
            expect(mockOpenAIClient.sendJsonMessage.calledOnce).to.be.true;
            expect(mockOpenAIClient.sendJsonMessage.calledWith(messages, options)).to.be.true;
            expect(result).to.deep.equal({
                data: { result: 'success' },
                responseId: 'resp_123'
            });
        });
        it('should log debug message when called', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            await openAIClientAdapter.sendJsonMessage(messages);
            expect(mockLogger.debug.calledOnce).to.be.true;
            expect(mockLogger.debug.firstCall.args[0]).to.include('Sending JSON message');
        });
    });
    describe('streamMessage', () => {
        it('should delegate to openAIClient.streamMessage with the same parameters', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const options = { model: 'gpt-4', temperature: 0.7 };
            await openAIClientAdapter.streamMessage(messages, options);
            expect(mockOpenAIClient.streamMessage.calledOnce).to.be.true;
            expect(mockOpenAIClient.streamMessage.calledWith(messages, options)).to.be.true;
        });
        it('should log debug message when called', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            await openAIClientAdapter.streamMessage(messages);
            expect(mockLogger.debug.calledOnce).to.be.true;
            expect(mockLogger.debug.firstCall.args[0]).to.include('Streaming message');
        });
    });
});
