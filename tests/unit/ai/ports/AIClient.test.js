import { expect } from "chai";
import AIClient from "@/core/ai/ports/AIClient.js";
'use strict';
/**
 * Unit Tests for AIClient Port Interface
 *
 * These tests verify that the AIClient port defines the expected
 * interface for AI client implementations.
 */
describe('AIClient Port', () => {
    let aiClient;
    beforeEach(() => {
        aiClient = new AIClient();
    });
    describe('Interface Definition', () => {
        it('should define a sendJsonMessage method', () => {
            expect(aiClient).to.have.property('sendJsonMessage');
            expect(aiClient.sendJsonMessage).to.be.a('function');
        });
        it('should define a streamMessage method', () => {
            expect(aiClient).to.have.property('streamMessage');
            expect(aiClient.streamMessage).to.be.a('function');
        });
    });
    describe('Method Behavior', () => {
        it('sendJsonMessage should throw "Method not implemented" error', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            expect(() => aiClient.sendJsonMessage(messages))
                .to.throw('Method not implemented');
        });
        it('streamMessage should throw "Method not implemented" error', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            expect(() => aiClient.streamMessage(messages))
                .to.throw('Method not implemented');
        });
    });
});
