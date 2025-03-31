import { jest } from '@jest/globals';
import { expect } from "chai";
import testEnv from "../loadEnv.js";
import { skipIfMissingEnv } from "../helpers/testHelpers.js";
describe('Test Environment', function () {
    it('should load environment variables', function () {
        const config = testEnv.getTestConfig();
        expect(config).to.be.an('object');
        expect(config.openai).to.be.an('object');
        expect(config.supabase).to.be.an('object');
        expect(config.test).to.be.an('object');
    });
    it('should have testHelpers available', function () {
        expect(skipIfMissingEnv).to.be.a('function');
    });
});
