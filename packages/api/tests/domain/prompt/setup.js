import sinon from "sinon";
// Hold sinon sandbox for test scope
let sandbox;
/**
 * Setup function for prompt tests
 * Creates a sinon sandbox and initializes any needed stubs
 */
function setup() {
    // Create a sandbox for test isolation
    sandbox = sinon.createSandbox();
    // Any common stubs needed for prompt tests can be added here
    return sandbox;
}
/**
 * Teardown function for prompt tests
 * Restores all stubs and cleans up the sandbox
 */
function teardown() {
    // Restore all stubs and mocks
    if (sandbox) {
        sandbox.restore();
    }
}
export { setup };
export { teardown };
export default {
    setup,
    teardown
};
