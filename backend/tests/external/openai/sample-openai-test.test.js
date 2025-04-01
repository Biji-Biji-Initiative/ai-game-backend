import { expect } from "chai";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { OpenAI } from "openai";

describe('OpenAI API', function () {
    let openai;
    
    before(function () {
        skipIfMissingEnv(this, 'openai');
        
        // Set up OpenAI client using v4 syntax
        const config = testEnv.getTestConfig();
        openai = new OpenAI({
            apiKey: config.openai.apiKey,
            organization: config.openai.organization
        });
    });
    
    // Set longer timeout for API calls
    this.timeout(30000);
    
    it('should be able to connect to OpenAI API', async function () {
        // Skip if API key not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            this.skip();
        }
        
        // Make a simple completion request using v4 syntax
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hello world' }
            ]
        });
        
        expect(completion).to.be.an('object');
        expect(completion.choices).to.be.an('array');
        expect(completion.choices.length).to.be.at.least(1);
        expect(completion.choices[0].message.content).to.be.a('string');
    });
});
