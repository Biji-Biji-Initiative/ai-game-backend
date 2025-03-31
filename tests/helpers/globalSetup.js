import testEnv from "./setupTestEnv.js";
import { logger } from "@/core/infra/logging/logger.js";
import * as chai from "chai";
import sinon from "sinon";
// Set test environment
process.env.NODE_ENV = 'test';
// Configure chai
const { expect } = chai;
// Initialize test environment
const env = testEnv.init();
// Configure logging level for tests
logger.level = process.env.TEST_LOG_LEVEL || 'error';
export const createRepositoryMock = () => ({
    findById: sinon.stub(),
    findByUserId: sinon.stub(),
    findByEmail: sinon.stub(),
    findAll: sinon.stub(),
    create: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
    save: sinon.stub()
});
export const createEventBusMock = () => ({
    publish: sinon.stub(),
    subscribe: sinon.stub()
});
export const createLoggerMock = () => ({
    info: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
    debug: sinon.stub()
});
export const createRequestMock = (user = { id: 'test-user-id', email: 'test@example.com' }) => ({
    user,
    params: {},
    body: {},
    query: {},
    headers: {},
    id: 'test-request-id'
});
export const createResponseMock = () => {
    const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis(),
        send: sinon.stub().returnsThis(),
        success: sinon.stub().returnsThis(),
        paginated: sinon.stub().returnsThis(),
        end: sinon.stub().returnsThis(),
        setHeader: sinon.stub().returnsThis()
    };
    return res;
};
export { expect };
export { sinon };
export { env };
export default {
    expect,
    sinon,
    env,
    createRepositoryMock,
    createEventBusMock,
    createLoggerMock,
    createRequestMock,
    createResponseMock
};
