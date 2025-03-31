import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { container } from '@src/config/container.js';
import { validateDependencies } from '@src/config/container/index.js';

/**
 * Integration test suite for validating the DI container's ability to resolve dependencies
 */
describe('DI Container Validation', () => {
    let containerInstance;
    
    beforeAll(() => {
        containerInstance = container;
    });
    
    /**
     * Test for the validateDependencies function
     */
    it('should validate all critical dependencies successfully', () => {
        const result = validateDependencies(containerInstance, false);
        expect(result).to.equal(true);
    });

    /**
     * Test the behavior when dependencies are missing
     */
    it('should detect missing dependencies', () => {
        // Create a mock container with missing dependencies
        const mockContainer = {
            resolve: (dep) => {
                if (dep === 'missingDep' || dep === 'messageRole' || dep === 'focusAreaThreadService') {
                    throw new Error(`Cannot resolve '${dep}'`);
                }
                return {};
            }
        };

        // Mock console.error to prevent test output pollution
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Spy on process.exit
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        
        // Test non-failing mode
        const resultNonFailing = validateDependencies(mockContainer, false);
        expect(resultNonFailing).to.equal(false);
        expect(mockExit).not.toHaveBeenCalled();
        
        // Test failing mode
        validateDependencies(mockContainer, true);
        expect(mockExit).to.have.been.calledWith(1);
        
        // Restore mocks
        mockError.mockRestore();
        mockExit.mockRestore();
    });
    
    /**
     * Test core services
     */
    describe('Core Services', () => {
        const coreServices = [
            'userService',
            'authService',
            'challengeService',
            'evaluationService',
            'progressService',
            'personalityService',
            'userJourneyService',
            'focusAreaService',
            'focusAreaThreadService',
            'focusAreaValidationService'
        ];
        
        coreServices.forEach(serviceName => {
            it(`should resolve ${serviceName}`, () => {
                const service = containerInstance.resolve(serviceName);
                expect(service).to.exist;
                
                // Validate constructor pattern
                if (typeof service === 'object' && service !== null) {
                    // Check that the service has expected core methods
                    if (serviceName.includes('Service')) {
                        // Most services should have at least one of these common methods
                        const hasCommonMethod = 
                            typeof service.findById === 'function' ||
                            typeof service.getById === 'function' ||
                            typeof service.create === 'function' ||
                            typeof service.update === 'function' ||
                            typeof service.save === 'function' ||
                            typeof service.delete === 'function';
                        
                        expect(hasCommonMethod).to.equal(true);
                    }
                }
            });
        });
    });
    
    /**
     * Test infrastructure components
     */
    describe('Infrastructure Components', () => {
        const infra = [
            'database',
            'logger',
            'eventEmitter',
            'mailer'
        ];
        
        infra.forEach(componentName => {
            it(`should resolve ${componentName}`, () => {
                const component = containerInstance.resolve(componentName);
                expect(component).to.exist;
            });
        });
    });
    
    /**
     * Test controllers
     */
    describe('Controllers', () => {
        const controllers = [
            'userController',
            'authController',
            'challengeController',
            'evaluationController',
            'personalityController',
            'progressController',
            'adaptiveController',
            'userJourneyController',
            'focusAreaController'
        ];
        
        controllers.forEach(controllerName => {
            it(`should resolve ${controllerName}`, () => {
                const controller = containerInstance.resolve(controllerName);
                expect(controller).to.exist;
            });
        });
    });
    
    /**
     * Test repositories
     */
    describe('Repositories', () => {
        const repositories = [
            'userRepository',
            'challengeRepository',
            'evaluationRepository',
            'progressRepository',
            'personalityRepository',
            'userJourneyRepository',
            'focusAreaRepository',
            'focusAreaConfigRepository'
        ];
        
        repositories.forEach(repoName => {
            it(`should resolve ${repoName}`, () => {
                const repo = containerInstance.resolve(repoName);
                expect(repo).to.exist;
            });
        });
    });
    
    /**
     * Test constants
     */
    describe('Constants', () => {
        const constants = [
            'messageRole',
            'userRoles',
            'errorCodes'
        ];
        
        constants.forEach(constantName => {
            it(`should resolve ${constantName}`, () => {
                const constant = containerInstance.resolve(constantName);
                expect(constant).to.exist;
            });
        });
    });
}); 