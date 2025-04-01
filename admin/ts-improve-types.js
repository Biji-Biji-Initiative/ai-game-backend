#!/usr/bin/env node

/**
 * TypeScript Type Improvement Script
 * 
 * This script scans TypeScript files and improves type annotations
 * by replacing 'any' with more specific types where possible.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common types that can replace 'any'
const commonTypes = {
  // String pattern replacements
  'name': 'string',
  'id': 'string',
  'key': 'string',
  'message': 'string',
  'text': 'string',
  'value': 'string',
  'label': 'string',
  'title': 'string',
  'description': 'string',
  'className': 'string',
  'style': 'string',
  'path': 'string',
  'url': 'string',
  'prefix': 'string',
  'suffix': 'string',
  'format': 'string',
  'level': 'string | number',
  
  // Number pattern replacements
  'index': 'number',
  'count': 'number',
  'length': 'number',
  'size': 'number',
  'width': 'number',
  'height': 'number',
  'duration': 'number',
  'timeout': 'number',
  'timestamp': 'number',
  'time': 'number',
  'date': 'Date | string | number',
  
  // Boolean pattern replacements
  'isActive': 'boolean',
  'isEnabled': 'boolean',
  'isVisible': 'boolean',
  'isOpen': 'boolean',
  'isLoading': 'boolean',
  'isValid': 'boolean',
  'enabled': 'boolean',
  'visible': 'boolean',
  'active': 'boolean',
  'open': 'boolean',
  'loading': 'boolean',
  
  // Array pattern replacements
  'items': 'any[]',
  'list': 'any[]',
  'array': 'any[]',
  'data': 'any[] | Record<string, any>',
  'elements': 'HTMLElement[]',
  
  // Function pattern replacements
  'callback': '(...args: any[]) => any',
  'handler': '(...args: any[]) => any',
  'listener': '(...args: any[]) => any',
  'fn': '(...args: any[]) => any',
  'func': '(...args: any[]) => any',
  
  // HTML element pattern replacements
  'element': 'HTMLElement',
  'el': 'HTMLElement',
  'container': 'HTMLElement',
  'target': 'HTMLElement | Event',
  'event': 'Event',
  'e': 'Event',
  
  // Object pattern replacements
  'options': 'Record<string, any>',
  'config': 'Record<string, any>',
  'settings': 'Record<string, any>',
  'props': 'Record<string, any>',
  'attributes': 'Record<string, any>',
  'params': 'Record<string, any>',
  'obj': 'Record<string, any>',
  'object': 'Record<string, any>',
};

// Interfaces to add to the top of files
const interfaces = {
  'ThemeVariables': `interface ThemeVariables {
  'bg-color': string;
  'text-color': string;
  'primary-color': string;
  'secondary-color': string;
  'accent-color': string;
  'border-color': string;
  'input-bg': string;
  'header-bg': string;
  'success-color': string;
  'error-color': string;
  'warning-color': string;
  'info-color': string;
  'code-bg': string;
  'shadow-color': string;
  [key: string]: string;
}`,

  'LoggerOptions': `interface LoggerOptions {
  level?: number;
  enableTimestamps?: boolean;
  consoleOutput?: boolean;
  fileOutput?: boolean;
  storeInMemory?: boolean;
  maxLogsInMemory?: number;
  [key: string]: any;
}`,

  'LogEntry': `interface LogEntry {
  level: string;
  message: string;
  timestamp: Date | null;
  args?: any[];
}`,

  'ApiResponse': `interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  [key: string]: any;
}`,

  'EndpointConfig': `interface EndpointConfig {
  url: string;
  method: string;
  description?: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
  [key: string]: any;
}`,
};

// Function to improve types in a file
function improveTypesInFile(filePath) {
  console.log(`Improving types in ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Don't process already converted files
  if (content.includes('// Types improved by ts-improve-types')) {
    console.log(`  Skipping ${fileName} - already improved`);
    return;
  }
  
  // Add the marker comment at the top
  content = `// Types improved by ts-improve-types\n${content}`;
  
  // Add relevant interfaces based on file content
  let interfacesToAdd = [];
  
  for (const [interfaceName, interfaceCode] of Object.entries(interfaces)) {
    // Only add interfaces that seem relevant to the file content
    const lowerFileName = fileName.toLowerCase();
    const lowerInterfaceName = interfaceName.toLowerCase();
    
    if (
      (lowerFileName.includes(lowerInterfaceName.replace('interface', '').toLowerCase())) ||
      (content.toLowerCase().includes(lowerInterfaceName.replace('interface', '').toLowerCase()))
    ) {
      if (!content.includes(interfaceName)) {
        interfacesToAdd.push(interfaceCode);
      }
    }
  }
  
  if (interfacesToAdd.length > 0) {
    // Find a good place to insert the interfaces
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Look for import statements
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      }
    }
    
    // If no imports found, insert after comments
    if (insertIndex === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('/**') || lines[i].startsWith('//')) {
          while (i < lines.length && (lines[i].startsWith('*') || lines[i].startsWith('//') || lines[i].trim() === '')) {
            i++;
          }
          insertIndex = i;
          break;
        }
      }
    }
    
    // Insert the interfaces
    lines.splice(insertIndex, 0, '\n' + interfacesToAdd.join('\n\n') + '\n');
    content = lines.join('\n');
  }
  
  // Replace 'any' with better types where variable names give hints
  for (const [pattern, replacement] of Object.entries(commonTypes)) {
    // Replace parameter types
    content = content.replace(
      new RegExp(`(${pattern}):\\s*any\\b`, 'g'),
      `$1: ${replacement}`
    );
    
    // Replace in arrow functions
    content = content.replace(
      new RegExp(`(${pattern}):\\s*any\\s*=>`, 'g'),
      `$1: ${replacement} =>`
    );
    
    // Replace in property declarations
    content = content.replace(
      new RegExp(`(${pattern}):\\s*any;`, 'g'),
      `$1: ${replacement};`
    );
  }
  
  // Replace special cases
  
  // Options parameter with interface
  if (content.includes('LoggerOptions')) {
    content = content.replace(
      /options:\s*any(\s*=\s*{[^}]*})/g,
      'options: LoggerOptions$1'
    );
  }
  
  // Theme variables
  if (content.includes('ThemeVariables')) {
    content = content.replace(
      /themeVars:\s*any/g,
      'themeVars: ThemeVariables'
    );
  }
  
  // API responses
  if (content.includes('ApiResponse')) {
    content = content.replace(
      /response:\s*any/g,
      'response: ApiResponse'
    );
  }
  
  // Logger log entries
  if (content.includes('LogEntry')) {
    content = content.replace(
      /logEntry:\s*any/g,
      'logEntry: LogEntry'
    );
  }
  
  // Endpoint configurations
  if (content.includes('EndpointConfig')) {
    content = content.replace(
      /endpoint:\s*any/g,
      'endpoint: EndpointConfig'
    );
  }
  
  // Remove some @ts-expect-error comments with better types
  content = content.replace(
    /\/\/\s*@ts-expect-error\s*TS\(2550\):[^(\n]*\(([^)]*)\)/g,
    '$1'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Improved types in ${fileName}`);
}

// Main function
function main() {
  console.log('TypeScript Type Improvement Script');
  console.log('=================================');
  
  // Find all TypeScript files
  const files = glob.sync('js/**/*.ts', { cwd: process.cwd() });
  
  // Process each file
  let processedCount = 0;
  for (const file of files) {
    improveTypesInFile(file);
    processedCount++;
  }
  
  console.log('\nSummary:');
  console.log(`Processed ${processedCount} TypeScript files`);
  console.log('Type improvement complete!');
}

// Execute the script
main(); 