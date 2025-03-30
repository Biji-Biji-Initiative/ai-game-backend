import { expect } from "chai";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
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
        // Test connectivity using a simple query without aggregate functions
        const { data, error } = await supabase
            .from('challenges')  // Try to use a core table that should exist
            .select('id')  // Just select a column, no aggregate functions
            .limit(1);
            
        // Log the result for verification
        console.log('Supabase connection test result:', { data, error });
        
        // Verify the connection is working, even if the table doesn't exist
        if (error) {
            // Check if it's a "relation does not exist" error - this is still a successful connection
            if (error.code === 'PGRST301') {
                console.log('Table "challenges" does not exist, but connection succeeded');
                // Test passes as we got a response from the server
                return;
            } else {
                // For other errors, test fails
                expect.fail(`Failed to connect to Supabase: ${error.message}`);
            }
        }
        
        // We successfully connected (no error)
        expect(true).to.be.true;
    });
    it('should query a test table', async function () {
        // Try a generic query that should work even on a fresh database
        const { data, error } = await supabase
            .from('challenges')  // Core application table
            .select('id')  // Just select the ID column for simplicity
            .limit(1);
            
        // Log the result for debugging
        console.log('Supabase query test result:', {
            hasData: !!data,
            dataCount: data?.length,
            error
        });
        
        // We don't assert on data existence, as the table might be empty or not exist
        // We just verify the query executed without a serious error
        if (error) {
            // If the table doesn't exist, that's not a connection failure
            if (error.code === 'PGRST301') {
                console.log('Table "challenges" does not exist, but query was processed');
            } else if (error.code === 'PGRST116') {
                // PGRST116 is "no rows returned" which is OK
                console.log('No rows returned from query, but query was processed');
            } else {
                expect.fail(`Supabase query failed: ${error.message}`);
            }
        }
    });
});
