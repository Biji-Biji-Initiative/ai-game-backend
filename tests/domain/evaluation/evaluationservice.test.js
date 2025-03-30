import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import EvaluationService from "../../../src/core/evaluation/services/evaluationService.js";
import { createUserId, createEvaluationId, UserId, EvaluationId } from "../../../src/core/common/valueObjects/index.js";
import { EvaluationDTO, EvaluationMapper } from "../../../src/core/evaluation/dtos/index.js";

describe('evaluation EvaluationService', () => {
    // Set longer timeout for API calls
    this.timeout(30000);

    // Define mocks for all dependencies
    let dependencies;
    let evaluationService;
    let testUserId;
    let testEvaluationId;

    beforeEach(() => {
        // Create Value Objects for testing
        testUserId = createUserId(uuidv4());
        testEvaluationId = createEvaluationId(uuidv4());

        // Create fresh mocks for each test
        dependencies = {
            // Repository mocks
            evaluationRepository: {
                findById: sinon.stub().resolves({ 
                    id: testEvaluationId.value,
                    userId: testUserId.value,
                    name: 'Test Evaluation',
                    criteria: { accuracy: 0.8, completeness: 0.9 },
                    createdAt: new Date().toISOString()
                }),
                save: sinon.stub().callsFake(entity => Promise.resolve({
                    ...entity,
                    id: entity.id || testEvaluationId.value
                })),
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
        evaluationService = new EvaluationService(dependencies);
    });

    afterEach(() => {
        // Clean up stubs
        sinon.restore();
    });

    describe('Evaluation Creation', () => {
        it('should create a new evaluation with valid DTO', async () => {
            // Arrange
            const evaluationDTO = new EvaluationDTO({
                userId: testUserId.value,
                name: 'Test Evaluation',
                criteria: {
                    accuracy: 0.8,
                    completeness: 0.9
                }
            });

            // Act
            const result = await evaluationService.createEvaluation(evaluationDTO);

            // Assert
            expect(result).to.exist;
            expect(result.id).to.be.instanceOf(EvaluationId);
            expect(result.userId).to.be.instanceOf(UserId);
            expect(result.userId.value).to.equal(testUserId.value);
            expect(result.name).to.equal(evaluationDTO.name);
            expect(result.criteria).to.deep.equal(evaluationDTO.criteria);

            // Verify repository was called with correct data
            expect(dependencies.evaluationRepository.save.calledOnce).to.be.true;
            const savedData = dependencies.evaluationRepository.save.firstCall.args[0];
            expect(savedData).to.deep.equal(EvaluationMapper.toEntity(evaluationDTO));
        });

        it('should handle validation errors in DTO', async () => {
            // Arrange
            const invalidDTO = new EvaluationDTO({
                userId: testUserId.value,
                name: '', // Invalid - name is required
                criteria: {
                    accuracy: 2.0 // Invalid - should be between 0 and 1
                }
            });

            // Act & Assert
            try {
                await evaluationService.createEvaluation(invalidDTO);
                expect.fail('Expected validation error was not thrown');
            } catch (err) {
                expect(err.message).to.include('validation failed');
                expect(dependencies.logger.error.called).to.be.true;
            }
        });
    });

    describe('Evaluation Retrieval', () => {
        it('should get evaluation by ID using Value Object', async () => {
            // Act
            const result = await evaluationService.getEvaluationById(testEvaluationId);

            // Assert
            expect(result).to.exist;
            expect(result.id).to.be.instanceOf(EvaluationId);
            expect(result.id.value).to.equal(testEvaluationId.value);
            expect(result.userId).to.be.instanceOf(UserId);

            // Verify repository was called with Value Object
            expect(dependencies.evaluationRepository.findById.calledWith(testEvaluationId.value)).to.be.true;
        });

        it('should get evaluations by user ID using Value Object', async () => {
            // Arrange
            const evaluations = [
                {
                    id: uuidv4(),
                    userId: testUserId.value,
                    name: 'Evaluation 1'
                },
                {
                    id: uuidv4(),
                    userId: testUserId.value,
                    name: 'Evaluation 2'
                }
            ];
            dependencies.evaluationRepository.findByUserId.resolves(evaluations);

            // Act
            const results = await evaluationService.getEvaluationsByUserId(testUserId);

            // Assert
            expect(results).to.be.an('array');
            results.forEach(result => {
                expect(result.id).to.be.instanceOf(EvaluationId);
                expect(result.userId).to.be.instanceOf(UserId);
                expect(result.userId.value).to.equal(testUserId.value);
            });

            // Verify repository was called with Value Object
            expect(dependencies.evaluationRepository.findByUserId.calledWith(testUserId.value)).to.be.true;
        });
    });

    describe('Domain Events', () => {
        it('should publish domain events with Value Objects', async () => {
            // Arrange
            const evaluationDTO = new EvaluationDTO({
                userId: testUserId.value,
                name: 'Test Evaluation',
                criteria: { accuracy: 0.8 }
            });

            // Act
            await evaluationService.createEvaluation(evaluationDTO);

            // Assert
            expect(dependencies.eventBus.publishEvent.called).to.be.true;
            const [eventType, eventData] = dependencies.eventBus.publishEvent.firstCall.args;
            expect(eventType).to.equal('EVALUATION_CREATED');
            expect(eventData.userId).to.equal(testUserId.value);
            expect(eventData.evaluationId).to.be.a('string');
        });
    });
});
