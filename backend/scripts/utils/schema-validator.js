const fs = require('fs');
const path = require('path');
const util = require('util');
require('dotenv').config();

// Get all migration files
const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));

// Function to parse SQL schema definition from migration files
/**
 *
 */
function parseSchemaFromMigrations() {
  const schema = {
    tables: {},
    types: {},
    functions: {},
    triggers: {}
  };
  
  migrationFiles.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Extract CREATE TABLE statements
    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/gi);
    for (const match of tableMatches) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      // Extract columns
      const columns = {};
      const columnMatches = tableDefinition.matchAll(/\s*(\w+)\s+([\w\s\(\)\[\]]+)(?:\s+REFERENCES\s+[\w\.]+\([\w\.]+\))?(?:\s+ON\s+DELETE\s+[\w\s]+)?(?:\s+DEFAULT\s+[^,]+)?(?:\s+NOT\s+NULL)?/gi);
      
      for (const colMatch of columnMatches) {
        if (colMatch[1] && colMatch[2] && !colMatch[1].match(/^\s*$/)) {
          columns[colMatch[1].trim()] = colMatch[2].trim();
        }
      }
      
      schema.tables[tableName] = { columns };
    }
    
    // Extract CREATE TYPE statements
    const typeMatches = sql.matchAll(/CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi);
    for (const match of typeMatches) {
      const typeName = match[1];
      const values = match[2].split(',')
        .map(v => v.trim().replace(/'/g, '').replace(/"/g, ''))
        .filter(v => v);
      
      schema.types[typeName] = { values };
    }
    
    // Extract CREATE FUNCTION statements
    const functionMatches = sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\(([\s\S]*?)\)\s+RETURNS\s+([\s\S]*?)AS/gi);
    for (const match of functionMatches) {
      const functionName = match[1];
      const params = match[2];
      const returnType = match[3];
      
      schema.functions[functionName] = { 
        params, 
        returnType: returnType.trim() 
      };
    }
    
    // Extract CREATE TRIGGER statements
    const triggerMatches = sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)\s+([\s\S]*?)EXECUTE\s+PROCEDURE\s+(\w+)/gi);
    for (const match of triggerMatches) {
      const triggerName = match[1];
      const definition = match[2];
      const procedure = match[3];
      
      schema.triggers[triggerName] = { 
        definition, 
        procedure 
      };
    }
  });
  
  return schema;
}

// Function to parse TypeScript schema (Supabase)
/**
 *
 */
function parseSupabaseSchema() {
  const schemaFile = path.join(__dirname, 'schema.types.ts');
  const content = fs.readFileSync(schemaFile, 'utf8');
  
  const supabaseSchema = {
    tables: {},
    types: {},
    functions: {}
  };
  
  // Find the public.Tables section which contains all table definitions
  const publicSection = content.match(/public:\s*{[\s\S]*?Tables:\s*{([\s\S]*?)}\s*Views:/);
  if (publicSection && publicSection[1]) {
    const tablesSection = publicSection[1];
    
    // Process each table definition
    const tableRegex = /(\w+):\s*{[\s\S]*?Row:\s*{([\s\S]*?)},[\s\S]*?Insert:/g;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(tablesSection)) !== null) {
      const tableName = tableMatch[1];
      const rowContent = tableMatch[2];
      
      const columns = {};
      
      // Extract column definitions
      const columnRegex = /(\w+):\s*([^;\n,]+)/g;
      let columnMatch;
      
      while ((columnMatch = columnRegex.exec(rowContent)) !== null) {
        columns[columnMatch[1]] = columnMatch[2].trim();
      }
      
      supabaseSchema.tables[tableName] = { columns };
    }
  }
  
  // Extract enum types from the content
  const enumPattern = /export type (\w+) =[\s\n]*((?:'[^']*'[\s\n]*\|[\s\n]*)*'[^']*')/g;
  let enumMatch;
  
  while ((enumMatch = enumPattern.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const enumValuesString = enumMatch[2];
    
    if (enumValuesString) {
      const values = enumValuesString
        .split('|')
        .map(v => v.trim().replace(/'/g, '').replace(/"/g, ''))
        .filter(v => v);
      
      supabaseSchema.types[enumName] = { values };
    }
  }
  
  return supabaseSchema;
}

// Function to find discrepancies between code schema and Supabase schema
/**
 *
 */
function findDiscrepancies(codeSchema, supabaseSchema) {
  const discrepancies = {
    missingTables: [],
    missingColumns: {},
    differentColumnTypes: {},
    missingTypes: [],
    differentTypeValues: {},
    unusedTables: [],
    unusedColumns: {}
  };
  
  // Check for tables in code but missing in Supabase
  for (const tableName in codeSchema.tables) {
    // Convert to lowercase for case insensitive comparison
    const lowercaseTableName = tableName.toLowerCase();
    
    // Try to find corresponding table in Supabase schema
    let found = false;
    let supabaseTableName = '';
    for (const sTableName in supabaseSchema.tables) {
      if (sTableName.toLowerCase() === lowercaseTableName) {
        found = true;
        supabaseTableName = sTableName;
        break;
      }
    }
    
    if (!found) {
      discrepancies.missingTables.push(tableName);
    } else {
      // Check for columns in code but missing in Supabase
      for (const colName in codeSchema.tables[tableName].columns) {
        // Convert to lowercase for case insensitive comparison
        const lowercaseColName = colName.toLowerCase();
        
        // Try to find corresponding column in Supabase schema
        let colFound = false;
        let supabaseColName = '';
        for (const sColName in supabaseSchema.tables[supabaseTableName].columns) {
          if (sColName.toLowerCase() === lowercaseColName) {
            colFound = true;
            supabaseColName = sColName;
            break;
          }
        }
        
        if (!colFound) {
          if (!discrepancies.missingColumns[tableName]) {
            discrepancies.missingColumns[tableName] = [];
          }
          discrepancies.missingColumns[tableName].push(colName);
        } else {
          // Check for different column types
          const codeType = codeSchema.tables[tableName].columns[colName];
          const supabaseType = supabaseSchema.tables[supabaseTableName].columns[supabaseColName];
          
          // This is a simple comparison and might need refinement based on type mapping
          if (!typesAreEquivalent(codeType, supabaseType)) {
            if (!discrepancies.differentColumnTypes[tableName]) {
              discrepancies.differentColumnTypes[tableName] = {};
            }
            discrepancies.differentColumnTypes[tableName][colName] = {
              codeType,
              supabaseType
            };
          }
        }
      }
    }
  }
  
  // Check for types in code but missing in Supabase
  for (const typeName in codeSchema.types) {
    // Convert to lowercase for case insensitive comparison
    const lowercaseTypeName = typeName.toLowerCase();
    
    // Try to find corresponding type in Supabase schema
    let found = false;
    let supabaseTypeName = '';
    for (const sTypeName in supabaseSchema.types) {
      if (sTypeName.toLowerCase() === lowercaseTypeName) {
        found = true;
        supabaseTypeName = sTypeName;
        break;
      }
    }
    
    if (!found) {
      discrepancies.missingTypes.push(typeName);
    } else {
      // Check for different type values
      const codeValues = new Set(codeSchema.types[typeName].values);
      const supabaseValues = new Set(supabaseSchema.types[supabaseTypeName].values);
      
      // Check if values are different
      if (codeValues.size !== supabaseValues.size || 
          !Array.from(codeValues).every(v => supabaseValues.has(v))) {
        discrepancies.differentTypeValues[typeName] = {
          codeValues: Array.from(codeValues),
          supabaseValues: Array.from(supabaseValues)
        };
      }
    }
  }
  
  // Check for tables in Supabase but not in code (possibly unused)
  for (const tableName in supabaseSchema.tables) {
    // Convert to lowercase for case insensitive comparison
    const lowercaseTableName = tableName.toLowerCase();
    
    // Try to find corresponding table in code schema
    let found = false;
    for (const cTableName in codeSchema.tables) {
      if (cTableName.toLowerCase() === lowercaseTableName) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      discrepancies.unusedTables.push(tableName);
    } else {
      // Check for columns in Supabase but not in code (possibly unused)
      const codeTableName = Object.keys(codeSchema.tables).find(
        t => t.toLowerCase() === lowercaseTableName
      );
      
      for (const colName in supabaseSchema.tables[tableName].columns) {
        // Convert to lowercase for case insensitive comparison
        const lowercaseColName = colName.toLowerCase();
        
        // Try to find corresponding column in code schema
        let colFound = false;
        for (const cColName in codeSchema.tables[codeTableName].columns) {
          if (cColName.toLowerCase() === lowercaseColName) {
            colFound = true;
            break;
          }
        }
        
        if (!colFound) {
          if (!discrepancies.unusedColumns[tableName]) {
            discrepancies.unusedColumns[tableName] = [];
          }
          discrepancies.unusedColumns[tableName].push(colName);
        }
      }
    }
  }
  
  return discrepancies;
}

// Helper function to determine if SQL and TypeScript types are equivalent
/**
 *
 */
function typesAreEquivalent(sqlType, tsType) {
  // This is a simplified comparison that could be enhanced
  sqlType = sqlType.toLowerCase();
  tsType = tsType.toLowerCase();
  
  // Common mappings
  if ((sqlType.includes('text') || sqlType.includes('varchar')) && 
      (tsType.includes('string'))) {
    return true;
  }
  
  if ((sqlType.includes('int') || sqlType.includes('serial')) && 
      (tsType.includes('number'))) {
    return true;
  }
  
  if (sqlType.includes('boolean') && tsType.includes('boolean')) {
    return true;
  }
  
  if ((sqlType.includes('json') || sqlType.includes('jsonb')) && 
      (tsType.includes('json') || tsType.includes('object') || tsType.includes('array'))) {
    return true;
  }
  
  if ((sqlType.includes('timestamp') || sqlType.includes('date')) && 
      (tsType.includes('string') || tsType.includes('date'))) {
    return true;
  }
  
  if (sqlType.includes('uuid') && tsType.includes('string')) {
    return true;
  }
  
  // For arrays
  if (sqlType.includes('[]') && tsType.includes('array')) {
    return true;
  }
  
  // For enums
  if (sqlType.match(/enum/i) && tsType.match(/string/i)) {
    return true;
  }
  
  // If we can't determine, default to false
  return false;
}

// Function to analyze code to find references to database tables/columns
/**
 *
 */
async function analyzeCodeReferences() {
  const srcDir = path.join(__dirname, 'src');
  const refCount = {
    tables: {},
    columns: {}
  };
  
  // Check if src directory exists
  if (!fs.existsSync(srcDir)) {
    console.log('Source directory not found. Skipping code reference analysis.');
    return refCount;
  }
  
  // Get all JavaScript/TypeScript files
  const jsFiles = [];
  
  /**
   *
   */
  function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        traverseDir(filePath);
      } else if (stats.isFile() && 
                (file.endsWith('.js') || file.endsWith('.ts') || 
                 file.endsWith('.tsx') || file.endsWith('.jsx'))) {
        jsFiles.push(filePath);
      }
    }
  }
  
  traverseDir(srcDir);
  
  // Get schema to check references
  const supabaseSchema = parseSupabaseSchema();
  
  // Analyze each file
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for table references
    for (const tableName in supabaseSchema.tables) {
      const tableRegex = new RegExp(`(from|table|\\.)\\s*['"]?${tableName}['"]?`, 'gi');
      const matches = content.match(tableRegex) || [];
      
      if (matches.length > 0) {
        if (!refCount.tables[tableName]) {
          refCount.tables[tableName] = 0;
        }
        refCount.tables[tableName] += matches.length;
        
        // If table is referenced, check for column references
        for (const colName in supabaseSchema.tables[tableName].columns) {
          const colRegex = new RegExp(`${colName}\\s*[:=]|["']${colName}["']`, 'gi');
          const colMatches = content.match(colRegex) || [];
          
          if (colMatches.length > 0) {
            if (!refCount.columns[`${tableName}.${colName}`]) {
              refCount.columns[`${tableName}.${colName}`] = 0;
            }
            refCount.columns[`${tableName}.${colName}`] += colMatches.length;
          }
        }
      }
    }
  }
  
  return refCount;
}

// Main function to run the analysis
/**
 *
 */
async function main() {
  console.log('Analyzing schemas...');
  
  const codeSchema = parseSchemaFromMigrations();
  console.log('Code schema parsed from migrations.');
  
  const supabaseSchema = parseSupabaseSchema();
  console.log('Supabase schema parsed from types file.');
  
  const discrepancies = findDiscrepancies(codeSchema, supabaseSchema);
  console.log('Discrepancies found between schemas.');
  
  const codeReferences = await analyzeCodeReferences();
  console.log('Code references analyzed.');
  
  // Generate report
  const report = {
    summary: {
      codeSchema: {
        tableCount: Object.keys(codeSchema.tables).length,
        typeCount: Object.keys(codeSchema.types).length,
        functionCount: Object.keys(codeSchema.functions).length,
        triggerCount: Object.keys(codeSchema.triggers).length
      },
      supabaseSchema: {
        tableCount: Object.keys(supabaseSchema.tables).length,
        typeCount: Object.keys(supabaseSchema.types).length
      },
      discrepancies: {
        missingTableCount: discrepancies.missingTables.length,
        missingColumnCount: Object.values(discrepancies.missingColumns)
          .reduce((sum, cols) => sum + cols.length, 0),
        differentColumnTypeCount: Object.values(discrepancies.differentColumnTypes)
          .reduce((sum, cols) => sum + Object.keys(cols).length, 0),
        missingTypeCount: discrepancies.missingTypes.length,
        differentTypeValueCount: Object.keys(discrepancies.differentTypeValues).length,
        unusedTableCount: discrepancies.unusedTables.length,
        unusedColumnCount: Object.values(discrepancies.unusedColumns)
          .reduce((sum, cols) => sum + cols.length, 0)
      }
    },
    discrepancies,
    codeReferences: {
      tablesWithNoReferences: Object.keys(supabaseSchema.tables)
        .filter(t => !codeReferences.tables[t])
    }
  };
  
  // Output report
  console.log('\n=== Schema Comparison Report ===\n');
  console.log('Summary:');
  console.log('- Code Schema: ' + 
              `${report.summary.codeSchema.tableCount} tables, ` +
              `${report.summary.codeSchema.typeCount} types, ` +
              `${report.summary.codeSchema.functionCount} functions, ` +
              `${report.summary.codeSchema.triggerCount} triggers`);
              
  console.log('- Supabase Schema: ' + 
              `${report.summary.supabaseSchema.tableCount} tables, ` +
              `${report.summary.supabaseSchema.typeCount} types`);
  
  console.log('\nDiscrepancies:');
  console.log('- Missing Tables in Supabase:', report.discrepancies.missingTables.length);
  console.log('- Missing Columns in Supabase:', report.summary.discrepancies.missingColumnCount);
  console.log('- Different Column Types:', report.summary.discrepancies.differentColumnTypeCount);
  console.log('- Missing Types in Supabase:', report.discrepancies.missingTypes.length);
  console.log('- Different Type Values:', report.summary.discrepancies.differentTypeValueCount);
  console.log('- Unused Tables in Supabase:', report.discrepancies.unusedTables.length);
  console.log('- Unused Columns in Supabase:', report.summary.discrepancies.unusedColumnCount);
  
  console.log('\nDetails:');
  if (report.discrepancies.missingTables.length > 0) {
    console.log('\nTables in code but missing in Supabase:');
    console.log(report.discrepancies.missingTables.join(', '));
  }
  
  if (Object.keys(report.discrepancies.missingColumns).length > 0) {
    console.log('\nColumns in code but missing in Supabase:');
    for (const [table, columns] of Object.entries(report.discrepancies.missingColumns)) {
      console.log(`- ${table}: ${columns.join(', ')}`);
    }
  }
  
  if (Object.keys(report.discrepancies.differentColumnTypes).length > 0) {
    console.log('\nColumns with different types:');
    for (const [table, columns] of Object.entries(report.discrepancies.differentColumnTypes)) {
      console.log(`- ${table}:`);
      for (const [col, types] of Object.entries(columns)) {
        console.log(`  * ${col}: Code=${types.codeType}, Supabase=${types.supabaseType}`);
      }
    }
  }
  
  if (report.discrepancies.missingTypes.length > 0) {
    console.log('\nTypes in code but missing in Supabase:');
    console.log(report.discrepancies.missingTypes.join(', '));
  }
  
  if (Object.keys(report.discrepancies.differentTypeValues).length > 0) {
    console.log('\nTypes with different values:');
    for (const [type, values] of Object.entries(report.discrepancies.differentTypeValues)) {
      console.log(`- ${type}:`);
      console.log(`  * Code: ${values.codeValues.join(', ')}`);
      console.log(`  * Supabase: ${values.supabaseValues.join(', ')}`);
    }
  }
  
  if (report.discrepancies.unusedTables.length > 0) {
    console.log('\nTables in Supabase but not in code (possibly unused):');
    console.log(report.discrepancies.unusedTables.join(', '));
  }
  
  if (Object.keys(report.discrepancies.unusedColumns).length > 0) {
    console.log('\nColumns in Supabase but not in code (possibly unused):');
    for (const [table, columns] of Object.entries(report.discrepancies.unusedColumns)) {
      console.log(`- ${table}: ${columns.join(', ')}`);
    }
  }
  
  if (report.codeReferences.tablesWithNoReferences.length > 0) {
    console.log('\nTables with no references in code:');
    console.log(report.codeReferences.tablesWithNoReferences.join(', '));
  }
  
  // Save full report to file
  fs.writeFileSync('schema-comparison-report.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to schema-comparison-report.json');
}

main().catch(err => {
  console.error('Error during schema analysis:', err);
}); 