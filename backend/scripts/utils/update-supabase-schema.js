const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to extract schema from SQL migrations
/**
 *
 */
function extractSchemaFromMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
  
  const codeSchema = {
    tables: {},
    types: {},
    functions: {},
    triggers: {}
  };
  
  // Process each migration file
  migrationFiles.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Extract table definitions
    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/gi);
    for (const match of Array.from(tableMatches)) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      if (!codeSchema.tables[tableName]) {
        codeSchema.tables[tableName] = { columns: {}, references: [], constraints: [] };
      }
      
      // Extract columns
      const lines = tableDefinition.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--') && !line.startsWith('/*'));
      
      for (const line of lines) {
        // Parse column definitions
        const columnMatch = line.match(/^\s*(\w+)\s+([\w\s\(\)\[\]]+)(?:[\s\S]*?)(?:,|\s*$)/);
        if (columnMatch && columnMatch[1] && columnMatch[2] && 
            !line.startsWith('PRIMARY KEY') && !line.startsWith('FOREIGN KEY') && 
            !line.startsWith('UNIQUE') && !line.startsWith('CHECK') && 
            !line.startsWith('CONSTRAINT')) {
          
          const columnName = columnMatch[1].trim();
          const columnType = columnMatch[2].trim();
          
          // Check for additional column attributes (NOT NULL, DEFAULT, etc.)
          const notNull = line.includes('NOT NULL');
          const defaultValue = line.match(/DEFAULT\s+([^,\s]+)/);
          const reference = line.match(/REFERENCES\s+([\w\.]+)\([\w\.]+\)/);
          
          codeSchema.tables[tableName].columns[columnName] = {
            type: columnType,
            notNull,
            defaultValue: defaultValue ? defaultValue[1] : null,
            reference: reference ? reference[1] : null
          };
        }
        // Parse constraints
        else if (line.match(/^\s*(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|CONSTRAINT)/i)) {
          codeSchema.tables[tableName].constraints.push(line);
        }
      }
    }
    
    // Extract ENUMs
    const enumMatches = sql.matchAll(/CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi);
    for (const match of Array.from(enumMatches)) {
      const typeName = match[1];
      const enumValues = match[2];
      
      codeSchema.types[typeName] = {
        values: enumValues
          .split(',')
          .map(v => v.trim().replace(/'/g, '').replace(/"/g, ''))
          .filter(v => v)
      };
    }
    
    // Extract functions
    const functionMatches = sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\(([\s\S]*?)\)\s+RETURNS\s+([\s\S]*?)AS([\s\S]*?);/gi);
    for (const match of Array.from(functionMatches)) {
      const functionName = match[1];
      const params = match[2];
      const returnType = match[3];
      const functionBody = match[4];
      
      codeSchema.functions[functionName] = {
        params,
        returnType: returnType.trim(),
        body: functionBody.trim()
      };
    }
    
    // Extract triggers
    const triggerMatches = sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)([\s\S]*?)EXECUTE\s+PROCEDURE\s+([^;]*);/gi);
    for (const match of Array.from(triggerMatches)) {
      const triggerName = match[1];
      const definition = match[2];
      const procedure = match[3];
      
      codeSchema.triggers[triggerName] = {
        definition: definition.trim(),
        procedure: procedure.trim()
      };
    }
  });
  
  return codeSchema;
}

// Function to extract schema information from Supabase TypeScript file
/**
 *
 */
function extractSchemaFromSupabase() {
  const schemaTypesPath = path.join(__dirname, 'schema.types.ts');
  const schemaContent = fs.readFileSync(schemaTypesPath, 'utf8');
  
  const supabaseSchema = {
    tables: {},
    types: {}
  };
  
  // Extract tables
  const tablesSection = schemaContent.match(/public:\s*{[\s\S]*?Tables:\s*{([\s\S]*?)}\s*Views:/);
  if (tablesSection && tablesSection[1]) {
    const tableRegex = /(\w+):\s*{[\r\n\s]*Row:\s*{([\s\S]*?)}[\r\n\s]*Insert:/g;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(tablesSection[1])) !== null) {
      const tableName = tableMatch[1];
      const columnsSection = tableMatch[2];
      
      supabaseSchema.tables[tableName] = { columns: {} };
      
      // Extract columns
      const columnLines = columnsSection.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'));
      
      columnLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const columnName = parts[0].trim();
          // Join all parts after the first colon to handle complex types
          const columnType = parts.slice(1).join(':').trim().replace(/,$/,'');
          
          if (columnName && columnType) {
            supabaseSchema.tables[tableName].columns[columnName] = { type: columnType };
          }
        }
      });
    }
  }
  
  // Extract types (ENUMs)
  const enumRegex = /export type (\w+) =[\s\n]*((?:'[^']*'[\s\n]*\|[\s\n]*)*'[^']*')/g;
  let enumMatch;
  
  while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
    const typeName = enumMatch[1];
    const valuesString = enumMatch[2];
    
    if (valuesString) {
      const values = valuesString
        .split('|')
        .map(v => v.trim().replace(/'/g, '').replace(/"/g, ''))
        .filter(v => v);
      
      supabaseSchema.types[typeName] = { values };
    }
  }
  
  return supabaseSchema;
}

// Function to generate SQL to update Supabase schema to match code schema
/**
 *
 */
function generateSchemaMigration(codeSchema, supabaseSchema) {
  let migrationSQL = '';
  
  // Add header
  migrationSQL += '-- Migration to update Supabase schema to match code schema\n';
  migrationSQL += '-- Generated on ' + new Date().toISOString() + '\n\n';
  
  // Process ENUMs
  for (const typeName in codeSchema.types) {
    if (!supabaseSchema.types[typeName]) {
      // Create new ENUM
      migrationSQL += `-- Create ENUM ${typeName} which is missing in Supabase\n`;
      migrationSQL += `CREATE TYPE ${typeName} AS ENUM (${codeSchema.types[typeName].values.map(v => `'${v}'`).join(', ')});\n\n`;
    } else {
      // Check for missing ENUM values
      const codeValues = new Set(codeSchema.types[typeName].values);
      const supabaseValues = new Set(supabaseSchema.types[typeName].values || []);
      
      const missingValues = [...codeValues].filter(v => !supabaseValues.has(v));
      
      if (missingValues.length > 0) {
        migrationSQL += `-- Add missing values to ENUM ${typeName}\n`;
        for (const value of missingValues) {
          migrationSQL += `ALTER TYPE ${typeName} ADD VALUE '${value}';\n`;
        }
        migrationSQL += '\n';
      }
    }
  }
  
  // Process tables
  for (const tableName in codeSchema.tables) {
    if (!supabaseSchema.tables[tableName]) {
      // Create new table
      migrationSQL += `-- Create table ${tableName} which is missing in Supabase\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      // Add columns
      const columns = [];
      for (const colName in codeSchema.tables[tableName].columns) {
        const col = codeSchema.tables[tableName].columns[colName];
        let colDef = `  ${colName} ${col.type}`;
        
        if (col.notNull) {
          colDef += ' NOT NULL';
        }
        
        if (col.defaultValue) {
          colDef += ` DEFAULT ${col.defaultValue}`;
        }
        
        if (col.reference) {
          colDef += ` REFERENCES ${col.reference}`;
        }
        
        columns.push(colDef);
      }
      
      // Add constraints
      for (const constraint of codeSchema.tables[tableName].constraints) {
        columns.push(`  ${constraint}`);
      }
      
      migrationSQL += columns.join(',\n');
      migrationSQL += '\n);\n\n';
      
    } else {
      // Check for missing columns
      for (const colName in codeSchema.tables[tableName].columns) {
        if (!supabaseSchema.tables[tableName].columns[colName]) {
          // Add missing column
          const col = codeSchema.tables[tableName].columns[colName];
          
          migrationSQL += `-- Add missing column ${colName} to table ${tableName}\n`;
          migrationSQL += `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${col.type}`;
          
          if (col.notNull) {
            // For NOT NULL columns, we need to handle potential existing rows
            migrationSQL += ` DEFAULT ${col.defaultValue || 'NULL'}`;
          }
          
          if (col.defaultValue) {
            migrationSQL += ` DEFAULT ${col.defaultValue}`;
          }
          
          if (col.reference) {
            migrationSQL += ` REFERENCES ${col.reference}`;
          }
          
          migrationSQL += ';\n';
          
          // If the column is NOT NULL but we used DEFAULT NULL above, now add the constraint
          if (col.notNull && !col.defaultValue) {
            migrationSQL += `-- Add NOT NULL constraint for ${colName}\n`;
            migrationSQL += `ALTER TABLE ${tableName} ALTER COLUMN ${colName} SET NOT NULL;\n`;
          }
          
          migrationSQL += '\n';
        }
      }
    }
  }
  
  // Add functions
  for (const funcName in codeSchema.functions) {
    migrationSQL += `-- Create or replace function ${funcName}\n`;
    migrationSQL += `CREATE OR REPLACE FUNCTION ${funcName}(${codeSchema.functions[funcName].params}) `;
    migrationSQL += `RETURNS ${codeSchema.functions[funcName].returnType} AS ${codeSchema.functions[funcName].body};\n\n`;
  }
  
  // Add triggers
  for (const triggerName in codeSchema.triggers) {
    migrationSQL += `-- Create trigger ${triggerName}\n`;
    migrationSQL += `CREATE TRIGGER ${triggerName} ${codeSchema.triggers[triggerName].definition} `;
    migrationSQL += `EXECUTE PROCEDURE ${codeSchema.triggers[triggerName].procedure};\n\n`;
  }
  
  return migrationSQL;
}

// Main function
/**
 *
 */
function main() {
  console.log('Analyzing code schema and Supabase schema...');
  
  // Extract schemas
  const codeSchema = extractSchemaFromMigrations();
  const supabaseSchema = extractSchemaFromSupabase();
  
  console.log(`Found ${Object.keys(codeSchema.tables).length} tables in code schema.`);
  console.log(`Found ${Object.keys(supabaseSchema.tables).length} tables in Supabase schema.`);
  
  // Generate migration SQL
  const migrationSQL = generateSchemaMigration(codeSchema, supabaseSchema);
  
  // Save migration SQL to file
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const migrationFileName = `update_supabase_schema_${timestamp}.sql`;
  fs.writeFileSync(migrationFileName, migrationSQL);
  
  console.log(`\nGenerated migration SQL saved to ${migrationFileName}`);
  console.log('\nTo apply this migration to Supabase:');
  console.log('1. Review the SQL file to ensure it\'s correct');
  console.log('2. Run the migration against your Supabase database using:');
  console.log(`   npx supabase db push --db-url YOUR_SUPABASE_DB_URL`);
}

main(); 