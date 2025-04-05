import { expect } from "chai";
import { getTestConfig, hasRequiredVars } from "../config/testConfig.js";
import { skipIfMissingEnv } from "../helpers/testHelpers.js";
describe('Test Environment', function () {
    it('should load environment variables', function () {
        const config = getTestConfig();
        expect(config).to.be.an('object');
        expect(config.openai).to.be.an('object');
        expect(config.supabase).to.be.an('object');
        expect(config.test).to.be.an('object');
    });
    it('should have testHelpers available', function () {
        expect(skipIfMissingEnv).to.be.a('function');
    });
});
