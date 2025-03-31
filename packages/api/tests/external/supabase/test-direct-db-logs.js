import { config } from "dotenv";
import fs from "fs";
import path from "path";
import util from "util";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/**
 * Direct Supabase DB Operations Logging
 * This script tests actual database operations and logs the results
 */
({ config }.config());
// Create logs directory
const logsDir = path.join(__dirname, 'direct_logs');
if (!fs.existsSync(logsDir)) {
    console.log(`Creating directory: ${logsDir}`);
    fs.mkdirSync(logsDir, { recursive: true });
}
// Helper function to log operations
/**
 *
 */
function logOperation(label, data) {
    const timestamp = new Date().toISOString();
    const logPath = path.join(logsDir, `${label.toLowerCase()}_${timestamp.replace(/[:.]/g, '-')}.json`);
    console.log(`\n===== ${label.toUpperCase()} (${timestamp}) =====`);
    console.log(util.inspect(data, { depth: 5, colors: true }));
    fs.writeFileSync(logPath, JSON.stringify({
        timestamp,
        label,
        data
    }, null, 2));
    console.log(`${label} logged to: ${logPath}`);
    return { timestamp, logPath };
}
/**
 *
 */
async function testDirectSupabaseOperations() {
    console.log('Testing Direct Supabase Operations with Logging');
    try {
        // Prepare Supabase credentials
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables must be set.');
        }
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Generate a test ID that we'll use for all operations
        const testId = `test_${Date.now()}`;
        let testTable = null; // Will store the first available table name
        // Test 1: Verify connection by checking available tables
        console.log('\n1. Testing Supabase Connection...');
        try {
            // List all tables in the public schema
            const { data, error } = await supabase
                .from('pg_catalog.pg_tables')
                .select('tablename')
                .eq('schemaname', 'public');
            if (error) {
                // Try a simpler approach - just check if we can connect at all
                const { data: versionCheck, error: versionError } = await supabase
                    .rpc('get_pg_version');
                if (versionError) {
                    // Last attempt - just try to get the service status
                    const { error: statusError } = await supabase.auth.getSession();
                    if (statusError) {
                        throw statusError;
                    }
                    logOperation('Connection', {
                        success: true,
                        message: 'Connected to Supabase Auth Service',
                        connection_time: new Date().toLocaleString()
                    });
                }
                else {
                    logOperation('Connection', {
                        success: true,
                        version: versionCheck,
                        connection_time: new Date().toLocaleString()
                    });
                }
            }
            else {
                // Get the list of tables
                const tables = data.map(row => row.tablename);
                logOperation('Connection', {
                    success: true,
                    available_tables: tables,
                    table_count: tables.length,
                    connection_time: new Date().toLocaleString()
                });
                // Store the first table for later tests if we have any
                if (tables.length > 0) {
                    testTable = tables[0];
                }
            }
            console.log('✅ Connection test successful');
        }
        catch (error) {
            logOperation('ConnectionError', {
                success: false,
                error: error.message,
                details: error
            });
            console.error('❌ Connection test failed:', error.message);
            throw error; // Rethrow to abort the rest of the tests
        }
        // Test 2: Insert test data
        console.log('\n2. Testing Data Insertion...');
        try {
            // Skip if we couldn't determine a table to use
            if (!testTable) {
                console.log('Skipping insert test - no tables available');
                return true;
            }
            // Create a test record with minimal data
            const testRecord = {
                id: testId,
                name: `Test Record ${testId}`,
                description: 'This is a test record created by the Supabase test script',
                created_at: new Date().toISOString()
            };
            logOperation('InsertData', { testRecord, table: testTable });
            // Try to insert it into the table
            const { data, error } = await supabase
                .from(testTable)
                .insert(testRecord)
                .select();
            if (error) {
                throw error;
            }
            logOperation('InsertResult', {
                success: true,
                inserted: data
            });
            console.log('✅ Insert test successful');
        }
        catch (error) {
            logOperation('InsertError', {
                success: false,
                error: error.message,
                details: error
            });
            console.log('❌ Insert test failed:', error.message);
            // Continue with other tests even if this one failed
        }
        // Test 3: Query data
        console.log('\n3. Testing Data Query...');
        try {
            // Skip if we couldn't determine a table to use
            if (!testTable) {
                console.log('Skipping query test - no tables available');
                return true;
            }
            // Query the table
            const { data, error } = await supabase
                .from(testTable)
                .select('*')
                .limit(5);
            if (error) {
                throw error;
            }
            logOperation('QueryResult', {
                success: true,
                table: testTable,
                count: data.length,
                data
            });
            console.log('✅ Query test successful');
        }
        catch (error) {
            logOperation('QueryError', {
                success: false,
                error: error.message,
                details: error
            });
            console.log('❌ Query test failed:', error.message);
        }
        // Test 4: Clean up test data
        console.log('\n4. Cleaning up test data...');
        try {
            // Skip if we couldn't determine a table to use
            if (!testTable) {
                console.log('Skipping cleanup test - no tables available');
                return true;
            }
            // Delete the test record we created
            const { data, error } = await supabase
                .from(testTable)
                .delete()
                .eq('id', testId);
            if (error) {
                throw error;
            }
            logOperation('CleanupResult', {
                success: true,
                table: testTable,
                deleted: testId
            });
            console.log('✅ Cleanup test successful');
        }
        catch (error) {
            logOperation('CleanupError', {
                success: false,
                error: error.message,
                details: error
            });
            console.log('❌ Cleanup test failed:', error.message);
        }
        console.log('\n✅ ALL TESTS COMPLETED');
        console.log(`✅ Logs saved in: ${logsDir}`);
        return true;
    }
    catch (error) {
        console.error('\n❌ TESTS FAILED:', error.message);
        return false;
    }
}
// Run the test
testDirectSupabaseOperations()
    .then(success => {
    process.exit(success ? 0 : 1);
})
    .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
