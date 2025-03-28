const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role for greater access
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Fetch all tables and their information
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      
      // Alternative approach if RPC function doesn't exist
      console.log('Trying alternative approach...');
      const { data, error } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('schemaname', 'public');
      
      if (error) {
        console.error('Error with alternative approach:', error);
        
        // Last resort - use system table query
        console.log('Fetching schema from information_schema...');
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.tables')
          .select('*')
          .eq('table_schema', 'public');
        
        if (schemaError) {
          console.error('Cannot fetch schema information:', schemaError);
          process.exit(1);
        }
        
        console.log('Schema Information:');
        console.log(JSON.stringify(schemaData, null, 2));
        return;
      }
      
      console.log('Tables Information:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('Database Schema:');
    console.log(JSON.stringify(tables, null, 2));
    
    // For each table, get columns
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);
      
      if (columnsError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        continue;
      }
      
      console.log(`\nColumns for ${table.table_name}:`);
      console.log(JSON.stringify(columns, null, 2));
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

getSchema(); 