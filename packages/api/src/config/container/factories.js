"../../../core/focusArea/factories/FocusAreaFactory.js;
'use strict';

/**
 * Factory Components Registration
 *
 * This module registers all factory components in the DI container.
 * Factories are responsible for encapsulating entity creation logic.
 */

/**
 * Register factory components in the container
 * @param {DIContainer} container - The DI container
 */
function registerFactoryComponents(container) {
    // Register domain factories
    container.register('challengeFactory', () => {
        return ChallengeFactory;
    }, true); // Singleton as it's stateless

    // Register FocusAreaFactory
    container.register('focusAreaFactory', () => {
        return FocusAreaFactory;
    }, true); // Singleton as it's stateless
}

export default registerFactoryComponents; "
