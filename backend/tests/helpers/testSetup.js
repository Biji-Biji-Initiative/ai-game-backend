import sinon from "sinon";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Store created stubs so we can restore them
let stubs = [];
let sandbox;
/**
 * Sets up a test environment with either real or stubbed dependencies
 */
function setup(options = {}) {
    const { useRealOpenAI = false, useRealSupabase = false, mockTime = false } = options;
    // Create a sandbox for this test
    sandbox = sinon.createSandbox();
    // Mock time if requested
    if (mockTime) {
        const now = new Date();
        const clock = sandbox.useFakeTimers(now.getTime());
        stubs.push({ type: 'clock', restore: () => clock.restore() });
    }
    // Setup logging for test run
    setupTestLogging();
}
/**
 * Sets up logging for the test run
 */
function setupTestLogging() {
    const logDir = path.join(__dirname, '..', 'logs');
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Create a log file for this test run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `test-run-${timestamp}.log`);
    // TODO: Set up a test-specific logger if needed
}
/**
 * Tears down the test environment
 */
function teardown() {
    // Restore all stubs
    stubs.forEach(stub => stub.restore && stub.restore());
    stubs = [];
    // Restore the sandbox
    sandbox && sandbox.restore();
}
/**
 * Creates a stub that restores automatically
 */
function createStub(object, method) {
    const stub = sandbox.stub(object, method);
    stubs.push(stub);
    return stub;
}
/**
 * Logs API responses for debugging
 */
function logApiResponse(name, response) {
    const logDir = path.join(__dirname, '..', 'logs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `api-response-${name}-${timestamp}.json`);
    try {
        fs.writeFileSync(logFile, JSON.stringify(response, null, 2));
    }
    catch (error) {
        console.error('Error logging API response:', error);
    }
}
export { setup };
export { teardown };
export { createStub };
export { logApiResponse };
export default {
    setup,
    teardown,
    createStub,
    logApiResponse
};
