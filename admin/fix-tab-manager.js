#!/usr/bin/env node

/**
 * Tab Manager TypeScript Error Fixer Script
 * 
 * This script fixes the specific issues in the tab-manager.ts file
 */

import fs from 'fs';

// Path to tab-manager.ts
const filePath = 'js/modules/tab-manager.ts';

function fixTabManagerFile() {
  console.log(`Fixing errors in ${filePath}...`);
  
  // Read file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix malformed parameter types with multiple colons
  content = content.replace(/(\w+): any(\w+): /g, '$1: ');
  
  // Fix other type issues
  content = content.replace(/tab\.\(id\)/g, 'tab.id');
  content = content.replace(/options: any\./g, 'options.');
  content = content.replace(/this: any\./g, 'this.');
  content = content.replace(/tabId: any\)/g, 'tabId)');
  content = content.replace(/event: any\)/g, 'event)');
  content = content.replace(/state: any\./g, 'state.');
  content = content.replace(/data: any\)/g, 'data)');
  content = content.replace(/callback: any\)/g, 'callback)');
  content = content.replace(/key: any\)/g, 'key)');
  content = content.replace(/value: any\)/g, 'value)');
  content = content.replace(/json: any\)/g, 'json)');
  content = content.replace(/error: any\)/g, 'error)');
  content = content.replace(/new: any/g, 'new');
  
  // Write back to file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed errors in ${filePath}`);
}

fixTabManagerFile(); 