#!/usr/bin/env node

/**
 * Script to automatically fix common JSDoc issues
 * - Adds JSDoc comments to functions, methods, and classes
 * - Adds missing @param and @returns tags
 * - Adds missing parameter descriptions
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration
const DRY_RUN = false; // Set to true to see changes without applying them

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Find all JavaScript files in the project
    const files = await glob('src/**/*.js');
    
    console.log(`Found ${files.length} JavaScript files to process`);
    
    // Track stats
    const stats = {
      functionsFixed: 0,
      methodsFixed: 0,
      classesFixed: 0,
      filesChanged: 0
    };

    // Process each file
    for (const file of files) {
      const fileStats = processFile(file);
      
      if (fileStats.changed) {
        stats.filesChanged++;
        stats.functionsFixed += fileStats.functionsFixed;
        stats.methodsFixed += fileStats.methodsFixed;
        stats.classesFixed += fileStats.classesFixed;
      }
    }

    console.log('\nSummary:');
    console.log(`Files changed: ${stats.filesChanged}`);
    console.log(`Functions fixed: ${stats.functionsFixed}`);
    console.log(`Methods fixed: ${stats.methodsFixed}`);
    console.log(`Classes fixed: ${stats.classesFixed}`);
    
    if (DRY_RUN) {
      console.log('\nThis was a dry run. No changes were written to disk.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Process a single file to fix JSDoc issues
 * @param {string} filePath - Path to the JavaScript file
 * @returns {Object} Stats about fixes applied
 */
function processFile(filePath) {
  try {
    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const stats = {
      functionsFixed: 0,
      methodsFixed: 0,
      classesFixed: 0,
      changed: false
    };
    
    // Track where we need to add JSDoc comments
    const fixPositions = [];
    
    // Track classes, whether we're inside a class, and detect methods
    let inClass = false;
    let currentClassName = '';
    let classIndentation = '';
    
    // Process the file line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const indentation = lines[i].match(/^\s*/)[0];
      
      // Detect class definitions without JSDoc
      if (line.startsWith('class ')) {
        const hasJSDoc = hasJSDocComment(lines, i);
        
        if (!hasJSDoc) {
          const className = line.match(/class\s+([^\s{]+)/)[1];
          currentClassName = className;
          inClass = true;
          classIndentation = indentation;
          
          // Create JSDoc for the class
          fixPositions.push({
            line: i,
            type: 'class',
            name: className,
            indentation
          });
          
          stats.classesFixed++;
        } else {
          // We have JSDoc but are entering a class
          const className = line.match(/class\s+([^\s{]+)/)[1];
          currentClassName = className;
          inClass = true;
          classIndentation = indentation;
        }
      }
      
      // Check for methods within classes - more strict matching to avoid non-method declarations
      if (inClass && !line.startsWith('//') && (
        // Matches method declarations but not if statements or method calls
        (line.match(/^\s*async\s+\w+\s*\([^)]*\)\s*{/) || 
         line.match(/^\s*\w+\s*\([^)]*\)\s*{/) ||
         line.match(/^\s*\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/) ||
         line.match(/^\s*\w+\s*=\s*(?:async\s+)?function\s*\([^)]*\)/))
      )) {
        // Skip constructor - it's documented with the class
        if (line.startsWith('constructor')) {
          continue;
        }
        
        const hasJSDoc = hasJSDocComment(lines, i);
        
        if (!hasJSDoc) {
          // Extract method name and parameters
          let methodName;
          let params = [];
          
          if (line.match(/^\s*async\s+(\w+)/)) {
            methodName = line.match(/^\s*async\s+(\w+)/)[1];
          } else if (line.match(/^\s*(\w+)\s*\(/)) {
            methodName = line.match(/^\s*(\w+)\s*\(/)[1];
          } else if (line.match(/^\s*(\w+)\s*=/)) {
            methodName = line.match(/^\s*(\w+)\s*=/)[1];
          }
          
          // Extract parameters from the method
          const paramMatch = line.match(/\((.*?)\)/);
          if (paramMatch && paramMatch[1].trim()) {
            params = paramMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
          }
          
          // Create JSDoc for the method
          fixPositions.push({
            line: i,
            type: 'method',
            name: methodName,
            params,
            indentation,
            className: currentClassName
          });
          
          stats.methodsFixed++;
        }
      }
      
      // Check if we're leaving a class definition
      if (inClass && line === '}' && indentation === classIndentation) {
        inClass = false;
        currentClassName = '';
      }
      
      // Check for standalone function declarations (not in a class)
      // More strict matching to avoid if statements or function calls
      if (!inClass && !line.startsWith('//') && (
        line.match(/^\s*function\s+\w+\s*\([^)]*\)/) || 
        line.match(/^\s*async\s+function\s+\w+\s*\([^)]*\)/) ||
        line.match(/^\s*const\s+\w+\s*=\s*function\s*\([^)]*\)/) ||
        line.match(/^\s*const\s+\w+\s*=\s*async\s*function\s*\([^)]*\)/) ||
        line.match(/^\s*const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/)
      )) {
        const hasJSDoc = hasJSDocComment(lines, i);
        
        if (!hasJSDoc) {
          // Extract function name and parameters
          let functionName;
          let params = [];
          
          if (line.match(/function\s+(\w+)/)) {
            functionName = line.match(/function\s+(\w+)/)[1];
          } else if (line.match(/async\s+function\s+(\w+)/)) {
            functionName = line.match(/async\s+function\s+(\w+)/)[1];
          } else if (line.match(/const\s+(\w+)\s*=/)) {
            functionName = line.match(/const\s+(\w+)\s*=/)[1];
          }
          
          // Extract parameters
          const paramMatch = line.match(/\((.*?)\)/);
          if (paramMatch && paramMatch[1].trim()) {
            params = paramMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
          }
          
          // Create JSDoc for the function
          fixPositions.push({
            line: i,
            type: 'function',
            name: functionName,
            params,
            indentation,
            returnsPromise: line.includes('async ') || line.includes('async function') || line.includes(' = async')
          });
          
          stats.functionsFixed++;
        }
      }
    }
    
    // Sort fix positions in reverse order (bottom to top) to avoid line number changes
    fixPositions.sort((a, b) => b.line - a.line);
    
    // Apply fixes
    let newContent = lines.join('\n');
    
    for (const fix of fixPositions) {
      const jsdoc = generateJSDoc(fix);
      const lineIndex = fix.line;
      
      // Insert JSDoc before the definition
      const contentLines = newContent.split('\n');
      contentLines.splice(lineIndex, 0, jsdoc);
      newContent = contentLines.join('\n');
    }
    
    // Only write if there were changes
    if (fixPositions.length > 0) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      stats.changed = true;
      console.log(`Fixed ${fixPositions.length} JSDoc issues in ${path.basename(filePath)}`);
    }
    
    return stats;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return { functionsFixed: 0, methodsFixed: 0, classesFixed: 0, changed: false };
  }
}

/**
 * Check if a line already has a JSDoc comment above it
 * @param {string[]} lines - Array of file lines
 * @param {number} lineIndex - Current line index
 * @returns {boolean} True if JSDoc exists
 */
function hasJSDocComment(lines, lineIndex) {
  // Look for JSDoc comment pattern above current line
  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Skip empty lines and single-line comments
    if (line === '' || line.startsWith('//')) {
      continue;
    }
    
    // Check if we found the end of a JSDoc block
    if (line.endsWith('*/')) {
      return true;
    }
    
    // If we hit another code line without finding JSDoc, there's no JSDoc
    return false;
  }
  
  return false;
}

/**
 * Generate appropriate JSDoc comment for a code element
 * @param {Object} fix - Fix details
 * @returns {string} Generated JSDoc comment
 */
function generateJSDoc(fix) {
  const { type, name, params = [], indentation, className, returnsPromise } = fix;
  
  let jsdoc = `${indentation}/**\n`;
  
  // Add description based on type
  if (type === 'class') {
    jsdoc += `${indentation} * ${className} class\n`;
  } else if (type === 'method') {
    jsdoc += `${indentation} * ${name} method\n`;
  } else if (type === 'function') {
    jsdoc += `${indentation} * ${name} function\n`;
  }
  
  // Add @param tags
  for (const param of params) {
    // Skip 'this' parameter
    if (param === 'this') {
      continue;
    }
    
    // Clean the parameter name (remove destructuring, etc.)
    let cleanParam = param;
    if (param.includes('{')) {
      cleanParam = 'options'; // For destructured parameters, use a generic name
    } else if (param.includes('[')) {
      cleanParam = param.replace(/\[\]/g, ''); // For array destructuring
    }
    
    // Determine parameter type placeholder
    const paramType = 'any';
    jsdoc += `${indentation} * @param {${paramType}} ${cleanParam} - Description of ${cleanParam} parameter\n`;
  }
  
  // Add @returns tag for functions and methods
  if (type === 'function' || type === 'method') {
    if (returnsPromise) {
      jsdoc += `${indentation} * @returns {Promise<any>} Description of return value\n`;
    } else {
      jsdoc += `${indentation} * @returns {any} Description of return value\n`;
    }
  }
  
  jsdoc += `${indentation} */`;
  return jsdoc;
}

main(); 