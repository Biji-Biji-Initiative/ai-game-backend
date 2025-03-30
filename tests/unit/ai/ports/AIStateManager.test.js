import { expect } from "chai";
import AIStateManager from "../../../../src/core/ai/ports/AIStateManager.js";
'use strict';
/**
 * Unit Tests for AIStateManager Port Interface
 *
 * These tests verify that the AIStateManager port defines the expected
 * interface for AI state management implementations.
 */
describe('AIStateManager Port', () => {
    let aiStateManager;
    beforeEach(() => {
        aiStateManager = new AIStateManager();
    });
    describe('Interface Definition', () => {
        it('should define a findOrCreateConversationState method', () => {
            expect(aiStateManager).to.have.property('findOrCreateConversationState');
            expect(aiStateManager.findOrCreateConversationState).to.be.a('function');
        });
        it('should define a getLastResponseId method', () => {
            expect(aiStateManager).to.have.property('getLastResponseId');
            expect(aiStateManager.getLastResponseId).to.be.a('function');
        });
        it('should define an updateLastResponseId method', () => {
            expect(aiStateManager).to.have.property('updateLastResponseId');
            expect(aiStateManager.updateLastResponseId).to.be.a('function');
        });
    });
    describe('Method Behavior', () => {
        it('findOrCreateConversationState should throw "Method not implemented" error', () => {
            expect(() => aiStateManager.findOrCreateConversationState('user123', 'context123'))
                .to.throw('Method not implemented');
        });
        it('getLastResponseId should throw "Method not implemented" error', () => {
            expect(() => aiStateManager.getLastResponseId('state123'))
                .to.throw('Method not implemented');
        });
        it('updateLastResponseId should throw "Method not implemented" error', () => {
            expect(() => aiStateManager.updateLastResponseId('state123', 'response123'))
                .to.throw('Method not implemented');
        });
    });
});
