const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    // Use the RPC function to execute a raw query to list tables
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      console.error('Error listing tables with RPC:', error);
      console.log('Trying alternate method...');
      
      // Try a direct SQL query through postgres functions
      const { data: tables, error: sqlError } = await supabase
        .from('_postgres_functions')
        .rpc('list_tables');
        
      if (sqlError) {
        console.error('Failed with SQL error:', sqlError);
        console.log('Creating a custom function to list tables...');
        
        // Create a function to list tables
        const createFuncQuery = `
          CREATE OR REPLACE FUNCTION public.list_tables()
          RETURNS TABLE (table_name text)
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT table_name::text
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
          $$;
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createFuncQuery });
        
        if (createError) {
          console.error('Failed to create function:', createError);
          
          // Last resort - let's make an authenticated REST call to get the SQL
          console.log('Making a direct request to the database to list tables...');
          
          const pgQuery = `
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
          `;
          
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'X-Client-Info': 'table-inspector'
            },
            body: JSON.stringify({
              query: pgQuery
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const tableData = await response.json();
          console.log('=== TABLES IN DATABASE ===');
          tableData.forEach((table, index) => {
            console.log(`${index + 1}. ${table.tablename}`);
          });
          console.log(`Total: ${tableData.length} tables`);
          return;
        }
        
        // Try again with our new function
        const { data: tablesFromFunc, error: funcError } = await supabase.rpc('list_tables');
        
        if (funcError) {
          console.error('Still failed after creating function:', funcError);
          return;
        }
        
        console.log('=== TABLES IN DATABASE ===');
        tablesFromFunc.forEach((table, index) => {
          console.log(`${index + 1}. ${table.table_name}`);
        });
        console.log(`Total: ${tablesFromFunc.length} tables`);
        return;
      }
      
      console.log('=== TABLES IN DATABASE ===');
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
      console.log(`Total: ${tables.length} tables`);
      return;
    }
    
    console.log('=== TABLES IN DATABASE ===');
    data.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    console.log(`Total: ${data.length} tables`);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listTables(); 