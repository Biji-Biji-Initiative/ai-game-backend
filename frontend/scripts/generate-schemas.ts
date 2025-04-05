import { exec } from 'child_process';
import { resolve } from 'path';
import * as fs from 'fs';

async function main() {
  console.log('Generating Zodios client from OpenAPI specification...');
  
  const inputPath = resolve(__dirname, '../../backend/openapi/generated/openapi-spec.json');
  const outputPath = resolve(__dirname, '../src/lib/api/generated-zodios-client.ts');
  
  const command = `npx openapi-zod-client "${inputPath}" -o "${outputPath}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      process.exit(1);
    }
    
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
    }
    
    console.log(`Command output: ${stdout}`);
    console.log(`Zodios client generated successfully at: ${outputPath}`);
    
    // Fix duplicate operationIds in the generated client
    console.log('Fixing duplicate operationIds in the generated client...');
    fixDuplicateOperationIds(outputPath);
  });
}

/**
 * Fixes duplicate operationIds in the generated Zodios client
 * This is a workaround for the issue with duplicate operationIds in the OpenAPI spec
 */
function fixDuplicateOperationIds(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Map known problematic operationIds to their correct versions
    const operationIdMappings = {
      // Map the duplicate operationId to a more specific name
      'getUserProgress': 'getUserJourneyProgress'
    };
    
    // Find and replace the specific aliases in the generated code
    let updatedContent = content;
    
    for (const [originalId, newId] of Object.entries(operationIdMappings)) {
      // Replace the alias in the endpoint definition
      const aliasRegex = new RegExp(`alias:\\s*["']${originalId}["']`, 'g');
      updatedContent = updatedContent.replace(aliasRegex, `alias: '${newId}'`);
      
      // Also update any references to the function
      const functionRegex = new RegExp(`\\b${originalId}\\b(?=\\s*:\\s*zodFetch)`, 'g');
      updatedContent = updatedContent.replace(functionRegex, newId);
    }
    
    // Keep track of seen aliases to remove duplicates
    const apiDeclarationStart = updatedContent.indexOf('export const api = makeApi([');
    const apiDeclarationEnd = updatedContent.indexOf(']);', apiDeclarationStart);
    
    if (apiDeclarationStart === -1 || apiDeclarationEnd === -1) {
      console.error('Could not find API declaration in the generated client');
      return;
    }
    
    const apiDeclaration = updatedContent.substring(apiDeclarationStart, apiDeclarationEnd + 2);
    
    // Split the API declaration into lines for processing
    const lines = apiDeclaration.split('\n');
    
    // Track existing aliases to find duplicates
    const seenAliases = new Set<string>();
    const uniqueLines: string[] = [];
    let inEndpoint = false;
    let currentEndpoint: string[] = [];
    let skipEndpoint = false;
    
    // Process each line to filter out duplicate endpoints
    for (const line of lines) {
      if (line.includes('{')) {
        inEndpoint = true;
        currentEndpoint = [line];
        skipEndpoint = false;
      } else if (inEndpoint) {
        currentEndpoint.push(line);
        
        // Check if this line contains the alias
        if (line.includes('alias:')) {
          const aliasMatch = line.match(/alias:\s*["']([^"']+)["']/);
          if (aliasMatch && aliasMatch[1]) {
            const alias = aliasMatch[1];
            if (seenAliases.has(alias)) {
              skipEndpoint = true;
            } else {
              seenAliases.add(alias);
            }
          }
        }
        
        if (line.includes('},')) {
          inEndpoint = false;
          if (!skipEndpoint) {
            uniqueLines.push(...currentEndpoint);
          }
          currentEndpoint = [];
        }
      } else {
        uniqueLines.push(line);
      }
    }
    
    // Reconstruct the API declaration with unique endpoints
    const updatedApiDeclaration = uniqueLines.join('\n');
    
    // Replace the original API declaration with the updated one
    const finalContent = updatedContent.substring(0, apiDeclarationStart) + 
                           updatedApiDeclaration + 
                           updatedContent.substring(apiDeclarationEnd + 2);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, finalContent, 'utf8');
    
    console.log('Fixed duplicate operationIds in the generated client');
  } catch (err) {
    console.error('Error fixing duplicate operationIds:', err);
  }
}

main(); 