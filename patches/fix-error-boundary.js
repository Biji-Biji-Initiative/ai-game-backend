#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the error-boundary.js file
const errorBoundaryPath = path.join(
  process.cwd(),
  'frontend/node_modules',
  'next',
  'dist',
  'client',
  'components',
  'error-boundary.js'
);

try {
  if (fs.existsSync(errorBoundaryPath)) {
    // Read the file
    const content = fs.readFileSync(errorBoundaryPath, 'utf8');
    
    console.log('Fixing error-boundary.js...');
    
    // Extract content without any patching attempts and with 'use client' at the top
    const lines = content.split('\n');
    let usedClientLine = -1;
    let problemFound = false;
    
    // Find the 'use client' line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('use client')) {
        usedClientLine = i;
        break;
      }
    }
    
    if (usedClientLine > 0) {
      problemFound = true;
      console.log(`Found 'use client' directive at line ${usedClientLine + 1} - moving to top of file`);
      
      // Remove the 'use client' line
      const useClientLine = lines.splice(usedClientLine, 1)[0];
      
      // Remove any patch-related code before it
      const cleanedLines = lines.filter(line => 
        !line.includes('_patchInteropRequireDefault') && 
        !line.includes('Try to execute the patch')
      );
      
      // Add 'use client' to the top
      cleanedLines.unshift(useClientLine);
      
      // Write back to the file
      fs.writeFileSync(errorBoundaryPath, cleanedLines.join('\n'), 'utf8');
      console.log('✓ Successfully fixed error-boundary.js');
    } else {
      console.log('Could not find the "use client" directive in the file');
    }
  } else {
    console.error('❌ Could not find error-boundary.js');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
} 