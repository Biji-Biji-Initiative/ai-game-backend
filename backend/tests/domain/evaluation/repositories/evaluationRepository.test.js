import { expect } from "chai";
import sinon from "sinon";
import { EvaluationRepository } from "@/core/evaluation/repositories/evaluationRepository.js";
import Evaluation from "@/core/evaluation/models/Evaluation.js";
import evaluationSchema from "@/core/evaluation/schemas/EvaluationSchema.js";

// Isolated test suite for unit testing the Evaluation Repository with Zod validation
describe('Evaluation Repository with Zod Validation', () => {
    let sandbox;
    let evaluationRepository;
    let supabaseMock;
    let loggerMock;
    let eventBusMock;

    before(() => {
        // Create a sandbox for stubs
        sandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        // Mock the supabase client to avoid actual API calls
        supabaseMock = {
            from: sandbox.stub().returnsThis()
        };

        // Mock the logger to avoid actual logging
        loggerMock = {
            info: sandbox.stub(),
            error: sandbox.stub(),
            debug: sandbox.stub(),
            child: sandbox.stub().returns({
                info: sandbox.stub(),
                error: sandbox.stub(),
                debug: sandbox.stub()
            })
        };

        // Mock event bus
        eventBusMock = {
            publishEvent: sandbox.stub().resolves()
        };

        // Create an instance of the repository with mock dependencies
        evaluationRepository = new EvaluationRepository({
            db: supabaseMock,
            logger: loggerMock,
            eventBus: eventBusMock
        });
    });

    afterEach(() => {
        // Restore stubs after each test
        sandbox.restore();
    });

    describe('createEvaluation() with validation', () => {
        it('should successfully create a valid evaluation', async () => {
            // Mock Supabase response
            const mockSupabaseResponse = {
                data: {
                    id: 'eval-123',
                    user_id: 'user-123',
                    challenge_id: 'challenge-123',
                    overall_score: 85,
                    category_scores: { logic: 90, creativity: 80 },
                    overall_feedback: 'Great work!',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                error: null
            };
            // Stub Supabase insert method
            const insertStub = sandbox.stub().returns({
                select: sandbox.stub().returns({
                    single: sandbox.stub().resolves(mockSupabaseResponse)
                })
            });
            supabaseMock.from.returns({
                insert: insertStub
            });
            // Mock the static method on Evaluation to avoid UUID dependency
            sandbox.stub(Evaluation, 'createNewId').returns('new-eval-id');
            // Mock the fromDatabase method on Evaluation
            sandbox.stub(Evaluation, 'fromDatabase').returns(new Evaluation({
                id: 'eval-123',
                userId: 'user-123',
                challengeId: 'challenge-123',
                score: 85,
                overallFeedback: 'Great work!'
            }));
            // Valid evaluation data
            const evaluationData = {
                userId: 'user-123',
                challengeId: 'challenge-123',
                score: 85,
                categoryScores: { logic: 90, creativity: 80 },
                overallFeedback: 'Great work!'
            };
            // Create evaluation
            const result = await evaluationRepository.createEvaluation(evaluationData);
            // Verify result
            expect(result).to.be.an.instanceOf(Evaluation);
            expect(result.userId).to.equal('user-123');
            expect(result.score).to.equal(85);
            // Verify Supabase was called
            expect(insertStub.called).to.be.true;
        });
        
        it('should reject creation with missing required fields', async () => {
            // Invalid evaluation data (missing challengeId)
            const invalidData = {
                userId: 'user-123',
                // No challengeId
                score: 85
            };
            try {
                await evaluationRepository.createEvaluation(invalidData);
                expect.fail('Should have thrown a validation error');
            }
            catch (error) {
                expect(error.message).to.include('Evaluation validation failed');
            }
        });
    });

    describe('updateEvaluation() with validation', () => {
        it('should successfully update with valid data', async () => {
            // Mock Supabase response
            const mockSupabaseResponse = {
                data: {
                    id: 'eval-123',
                    user_id: 'user-123',
                    challenge_id: 'challenge-123',
                    overall_score: 90, // Updated score
                    category_scores: { logic: 95, creativity: 85 },
                    overall_feedback: 'Updated feedback',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                error: null
            };
            // Stub Supabase update method
            const updateStub = sandbox.stub().returns({
                eq: sandbox.stub().returns({
                    select: sandbox.stub().returns({
                        single: sandbox.stub().resolves(mockSupabaseResponse)
                    })
                })
            });
            supabaseMock.from.returns({
                update: updateStub
            });
            // Mock the Evaluation.fromDatabase method
            sandbox.stub(Evaluation, 'fromDatabase').returns(new Evaluation({
                id: 'eval-123',
                userId: 'user-123',
                challengeId: 'challenge-123',
                score: 90,
                overallFeedback: 'Updated feedback'
            }));
            // Valid update data
            const updateData = {
                score: 90,
                categoryScores: { logic: 95, creativity: 85 },
                overallFeedback: 'Updated feedback'
            };
            // Update evaluation
            const result = await evaluationRepository.updateEvaluation('eval-123', updateData);
            // Verify result
            expect(result).to.be.an.instanceOf(Evaluation);
            expect(result.score).to.equal(90);
            expect(result.overallFeedback).to.equal('Updated feedback');
            // Verify Supabase was called
            expect(updateStub.called).to.be.true;
        });

        it('should reject updates with invalid data', async () => {
            // Invalid update data (score out of range)
            const invalidData = {
                score: 200, // Invalid score (> 100)
                overallFeedback: 'Invalid update'
            };
            try {
                await evaluationRepository.updateEvaluation('eval-123', invalidData);
                expect.fail('Should have thrown a validation error');
            }
            catch (error) {
                expect(error.message).to.include('Evaluation update validation failed');
            }
        });
    });

    describe('getEvaluationsForUser() with validation', () => {
        it('should use validated options', async () => {
            // Mock Supabase response
            const mockSupabaseResponse = {
                data: [
                    {
                        id: 'eval-123',
                        user_id: 'user-123',
                        challenge_id: 'challenge-123',
                        overall_score: 85
                    }
                ],
                error: null
            };
            // Stub for range method
            const rangeStub = sandbox.stub().resolves(mockSupabaseResponse);
            // Stubs for the chain
            const selectStub = sandbox.stub().returns({
                eq: sandbox.stub().returns({
                    order: sandbox.stub().returns({
                        range: rangeStub
                    })
                })
            });
            supabaseMock.from.returns({
                select: selectStub
            });
            // Mock the Evaluation.fromDatabase method
            sandbox.stub(Evaluation, 'fromDatabase').returns(new Evaluation({
                id: 'eval-123',
                userId: 'user-123',
                challengeId: 'challenge-123',
                score: 85
            }));
            // Valid options
            const options = {
                limit: 10,
                offset: 0,
                challengeId: 'challenge-123'
            };
            // Get evaluations
            const result = await evaluationRepository.getEvaluationsForUser('user-123', options);
            // Verify results
            expect(result).to.be.an('array');
            expect(result.length).to.equal(1);
            expect(result[0]).to.be.an.instanceOf(Evaluation);
            // Verify range was called with correct parameters
            expect(rangeStub.called).to.be.true;
        });

        it('should reject with invalid options', async () => {
            // Invalid options (negative limit)
            const invalidOptions = {
                limit: -5,
                offset: 0
            };
            try {
                await evaluationRepository.getEvaluationsForUser('user-123', invalidOptions);
                expect.fail('Should have thrown a validation error');
            }
            catch (error) {
                expect(error.message).to.include('limit');
            }
        });
    });

    describe('saveEvaluation() with validation', () => {
        beforeEach(() => {
            // Mock getEvaluationById to return null (simulating new evaluation)
            sandbox.stub(evaluationRepository, 'getEvaluationById').resolves(null);
            // Mock createEvaluation to succeed
            sandbox.stub(evaluationRepository, 'createEvaluation').callsFake(data => {
                return Promise.resolve(new Evaluation(data));
            });
        });

        it('should validate before saving', async () => {
            // Create a mock Evaluation that passes isValid() but has invalid data for Zod
            const mockEvaluation = {
                id: 'eval-123',
                userId: 'user-123',
                challengeId: 'challenge-123',
                score: 500, // Invalid score (> 100)
                isValid: () => true,
                toObject: () => ({
                    id: 'eval-123',
                    userId: 'user-123',
                    challengeId: 'challenge-123',
                    score: 500,
                    overallFeedback: 'Test evaluation'
                })
            };

            try {
                await evaluationRepository.saveEvaluation(mockEvaluation);
                expect.fail('Should have thrown a validation error');
            }
            catch (error) {
                expect(error.message).to.include('Evaluation validation failed');
            }
        });
    });
});
