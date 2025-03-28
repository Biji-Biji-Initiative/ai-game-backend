const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Pick a specific table to analyze
const targetTable = 'challenges';

// Read the schema.types.ts file to check if the table exists
const schemaTypesPath = path.join(__dirname, 'schema.types.ts');
const schemaContent = fs.readFileSync(schemaTypesPath, 'utf8');

console.log(`Analyzing table '${targetTable}' between your code and Supabase schema...`);

// Find the challenges table in the schema
// Using a more precise regex to extract just the Row type
const tableRegex = /challenges:\s*{[\r\n\s]*Row:\s*{([\s\S]*?)}[\r\n\s]*Insert:/;
const match = schemaContent.match(tableRegex);

if (match) {
  console.log(`✅ Table '${targetTable}' exists in Supabase schema.`);
  
  // Extract columns from Supabase schema
  const supabaseColumns = [];
  const columnsSection = match[1];
  
  // Improved column regex to properly extract columns
  const columnLines = columnsSection.split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes(':'));
  
  columnLines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      // Join all parts after the first colon to handle complex types
      const type = parts.slice(1).join(':').trim().replace(/,$/,'');
      
      if (name && type) {
        supabaseColumns.push({ name, type });
      }
    }
  });
  
  console.log(`Found ${supabaseColumns.length} columns in Supabase schema.`);
  
  // Read migration files to check for the table definition
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
  
  let tableFound = false;
  let codeColumns = [];
  
  // Search for table definition in migration files
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Check if this file contains the table definition
    const createTableRegex = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${targetTable}\\s*\\(([\\s\\S]*?)\\);`, 'i');
    const createMatch = sql.match(createTableRegex);
    
    if (createMatch) {
      tableFound = true;
      console.log(`✅ Found '${targetTable}' definition in migration file: ${file}`);
      
      // Extract column definitions
      const tableDefinition = createMatch[1];
      
      // Split by commas but be careful with commas inside parentheses (for functions, default values, etc.)
      const lines = tableDefinition.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--') && !line.startsWith('/*'));
      
      // Process each line to extract column definitions
      for (const line of lines) {
        // Skip lines that don't look like column definitions
        if (line.startsWith('PRIMARY KEY') || line.startsWith('FOREIGN KEY') || 
            line.startsWith('UNIQUE') || line.startsWith('CHECK') || 
            line.startsWith('CONSTRAINT')) {
          continue;
        }
        
        // Extract column name and type
        const columnMatch = line.match(/^\s*(\w+)\s+([\w\s\(\)\[\]]+)(?:[\s\S]*)?$/);
        if (columnMatch && columnMatch[1] && columnMatch[2]) {
          codeColumns.push({
            name: columnMatch[1].trim(),
            type: columnMatch[2].trim()
          });
        }
      }
      
      console.log(`Found ${codeColumns.length} columns in code schema.`);
      break;
    }
  }
  
  if (!tableFound) {
    console.log(`❌ Table '${targetTable}' not found in migration files.`);
  } else {
    // Compare columns between Supabase and code
    console.log('\nComparing columns between code and Supabase schema:');
    
    // Check for columns in code but missing in Supabase
    const missingInSupabase = codeColumns.filter(codeCol => 
      !supabaseColumns.some(supabaseCol => supabaseCol.name.toLowerCase() === codeCol.name.toLowerCase())
    );
    
    // Check for columns in Supabase but missing in code
    const missingInCode = supabaseColumns.filter(supabaseCol => 
      !codeColumns.some(codeCol => codeCol.name.toLowerCase() === supabaseCol.name.toLowerCase())
    );
    
    if (missingInSupabase.length > 0) {
      console.log('\n❌ Columns in code but missing in Supabase:');
      missingInSupabase.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    } else {
      console.log('\n✅ All columns from code exist in Supabase schema.');
    }
    
    if (missingInCode.length > 0) {
      console.log('\n⚠️ Columns in Supabase but not in code (potentially unused):');
      missingInCode.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    } else {
      console.log('\n✅ No extra columns in Supabase schema.');
    }
    
    // Show all columns for comparison
    console.log('\nAll columns in code schema:');
    codeColumns.forEach(col => console.log(`  - ${col.name}: ${col.type}`));
    
    console.log('\nAll columns in Supabase schema:');
    supabaseColumns.forEach(col => console.log(`  - ${col.name}: ${col.type}`));
  }
} else {
  console.log(`❌ Table '${targetTable}' does not exist in Supabase schema.`);
  
  // Check if the table exists in migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
  
  let tableFound = false;
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    if (sql.match(new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${targetTable}`, 'i'))) {
      tableFound = true;
      console.log(`✅ Found '${targetTable}' definition in migration file: ${file}`);
      console.log(`⚠️ Table exists in code but not in Supabase. Consider running migrations to update Supabase.`);
      break;
    }
  }
  
  if (!tableFound) {
    console.log(`❌ Table '${targetTable}' not found in migration files either.`);
  }
} 