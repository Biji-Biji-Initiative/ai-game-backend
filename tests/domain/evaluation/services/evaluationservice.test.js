import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import EvaluationService from "../../../../src/core/evaluation/services/EvaluationService.js";
describe('evaluation EvaluationService', () => {
    // Set longer timeout for API calls
    jest.setTimeout(30000);
    // Define mocks for all dependencies
    let dependencies;
    let evaluationservice;
    beforeEach(() => {
        // Create fresh mocks for each test
        dependencies = {
            // Repository mocks
            evaluationRepository: {
                findById: sinon.stub().resolves({ id: '123', name: 'Test' }),
                save: sinon.stub().callsFake(entity => Promise.resolve(entity)),
                findByUserId: sinon.stub().resolves([]),
                delete: sinon.stub().resolves(true)
            },
            // Event bus mock
            eventBus: {
                publishEvent: sinon.stub().resolves()
            },
            // Logger mock
            logger: {
                info: sinon.stub(),
                error: sinon.stub(),
                debug: sinon.stub(),
                warn: sinon.stub()
            },
            // OpenAI client mock (if needed)
            openAIClient: {
                sendMessage: sinon.stub().resolves({ content: 'Mock AI response' }),
                streamMessage: sinon.stub().resolves({
                    on: sinon.stub().returns({ on: sinon.stub() })
                })
            }
        };
        // Create the service with mocked dependencies
        evaluationservice = new EvaluationService(dependencies);
    });
    afterEach(() => {
        // Clean up stubs
        sinon.restore();
    });
    describe('someMethod', () => {
        it('should perform the expected action', async () => {
            // Arrange
            const testData = { id: '123' };
            dependencies.evaluationRepository.findById.resolves({
                id: '123',
                name: 'Test Entity'
            });
            // Act
            const result = await evaluationservice.someMethod(testData);
            // Assert
            expect(result).to.exist;
            expect(dependencies.evaluationRepository.findById.calledWith('123')).to.be.true;
        });
        it('should handle errors properly', async () => {
            // Arrange
            const testData = { id: '456' };
            const error = new Error('Test error');
            dependencies.evaluationRepository.findById.rejects(error);
            // Act & Assert
            try {
                await evaluationservice.someMethod(testData);
                expect.fail('Expected error was not thrown');
            }
            catch (err) {
                expect(err).to.equal(error);
                expect(dependencies.logger.error.called).to.be.true;
            }
        });
    });
    describe('publishingEvents', () => {
        it('should publish domain events', async () => {
            // Arrange
            const testData = { id: '789', trigger: 'event' };
            // Act
            await evaluationservice.triggerEvent(testData);
            // Assert
            expect(dependencies.eventBus.publishEvent.called).to.be.true;
            const [eventType, eventData] = dependencies.eventBus.publishEvent.firstCall.args;
            expect(eventType).to.be.a('string');
            expect(eventData).to.include({ entityId: '789' });
        });
    });
});
