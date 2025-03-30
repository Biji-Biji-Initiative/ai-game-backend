import { expect } from "chai";
import testEnv from "../../../loadEnv.js";
import { skipIfMissingEnv } from "../../../helpers/testHelpers.js";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
({ config }.config());
describe('Supabase Client', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    before(function () {
        skipIfMissingEnv(this, 'supabase');
    });
    let supabase;
    before(function () {
        // Skip tests if Supabase credentials not available
        if (!testEnv.getTestConfig().supabase.url || !testEnv.getTestConfig().supabase.key) {
            console.warn('Supabase credentials not found in environment, skipping tests');
            this.skip();
        }
        supabase = createClient(testEnv.getTestConfig().supabase.url, testEnv.getTestConfig().supabase.key);
    });
    it('should connect to Supabase', async function () {
        // Simple test to verify connectivity - just fetch the server timestamp
        const { data, error } = await supabase.rpc('get_current_timestamp');
        // Log the result for verification
        console.log('Supabase connection test result:', { data, error });
        // Verify no error occurred
        expect(error).to.be.null;
        // Verify we got some data back
        expect(data).to.exist;
    });
    it('should query a test table', async function () {
        // Try to query a table - we'll use a generic query that should work
        // even if the exact table structure is unknown
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .limit(1);
        // Log the result for debugging
        console.log('Supabase query test result:', {
            hasData: !!data,
            dataCount: data?.length,
            error
        });
        // We don't assert on data existence, as the table might be empty or not exist
        // We just verify the query executed without error
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
            expect.fail(`Supabase query failed: ${error.message}`);
        }
    });
});
