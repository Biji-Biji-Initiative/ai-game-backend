import domainEvents from "../../../src/core/common/events/domainEvents";
import logger from "../../../src/utils/logger";
// Configure the logger for tests
if (logger.configure) {
    logger.configure({
        level: process.env.TEST_LOG_LEVEL || 'error', // Silence logs in tests unless specified
        transports: [] // No transports in tests
    });
}
/**
 * Reset application state before each test
 */
function resetAppState() {
    // Clear domain events
    domainEvents.clearAll();
}
/**
 * Setup function to call before each test
 */
function setup() {
    resetAppState();
}
/**
 * Teardown function to call after each test
 */
function teardown() {
    resetAppState();
}
export { setup };
export { teardown };
export { resetAppState };
export default {
    setup,
    teardown,
    resetAppState
};
