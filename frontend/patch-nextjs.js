#!/usr/bin/env node

/**
 * This script directly patches the Next.js interopRequireDefault helper
 * to fix the "TypeError: _interop_require_default._ is not a function" error
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Next.js patch utility...');

// Paths to check for the interopRequireDefault.js file
const possiblePaths = [
  './node_modules/next/dist/compiled/@babel/runtime/helpers/interopRequireDefault.js',
  './node_modules/next/dist/compiled/@babel/runtime/helpers/esm/interopRequireDefault.js',
  './node_modules/next/dist/server/future/route-modules/app-page/module.compiled.js'
];

// The correct implementation of interopRequireDefault
const patchContent = `// PATCHED BY CUSTOM SCRIPT
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// Add the missing function that causes "TypeError: _interop_require_default._ is not a function"
_interopRequireDefault._ = function(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
};

module.exports = _interopRequireDefault;
`;

// Helper function to check if a file needs patching
function needsPatching(content) {
  return (
    (content.includes('function _interopRequireDefault') ||
      content.includes('var _interopRequireDefault =')) &&
    !content.includes('_interopRequireDefault._') &&
    !content.includes('PATCHED')
  );
}

// Track patched files
let patchedFiles = 0;
let failedFiles = 0;

// Patch the listed files directly
for (const filePath of possiblePaths) {
  try {
    const fullPath = path.resolve(filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Only patch if it needs patching
      if (needsPatching(content)) {
        console.log(`📝 Patching ${filePath}...`);
        
        // Create a backup
        fs.writeFileSync(`${fullPath}.backup`, content, 'utf8');
        
        // Write the patched version
        fs.writeFileSync(fullPath, patchContent, 'utf8');
        console.log(`✅ Successfully patched ${filePath}`);
        patchedFiles++;
      } else if (content.includes('PATCHED') || content.includes('_interopRequireDefault._')) {
        console.log(`ℹ️ File ${filePath} is already patched.`);
      } else {
        console.log(`⚠️ File ${filePath} doesn't need patching or has an unexpected format.`);
      }
    }
  } catch (err) {
    console.error(`❌ Error patching ${filePath}:`, err.message);
    failedFiles++;
  }
}

// Search for special case in module.compiled.js
try {
  const modulePath = './node_modules/next/dist/server/future/route-modules/app-page/module.compiled.js';
  if (fs.existsSync(modulePath)) {
    let content = fs.readFileSync(modulePath, 'utf8');
    
    // Check for specific pattern to modify
    if (content.includes('_interopRequireDefault(') && !content.includes('_interopRequireDefault._')) {
      console.log('📝 Applying special patch to module.compiled.js...');
      
      // Create a backup if it doesn't exist
      if (!fs.existsSync(`${modulePath}.backup`)) {
        fs.writeFileSync(`${modulePath}.backup`, content, 'utf8');
      }
      
      // Add special injected function
      const injectedCode = `
// PATCHED: Add missing _interopRequireDefault._ function
if (typeof _interopRequireDefault === 'function' && !_interopRequireDefault._) {
  _interopRequireDefault._ = function(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  };
}
`;
      
      // Try to find a good position for injection
      let position = -1;
      
      // Look for the first occurrence of _interopRequireDefault function
      const match = content.match(/(?:var|function|const) _interopRequireDefault/);
      if (match) {
        // Find the end of the function definition
        const functionStart = match.index;
        let bracketCount = 0;
        let inFunction = false;
        
        for (let i = functionStart; i < content.length; i++) {
          if (content[i] === '{') {
            bracketCount++;
            inFunction = true;
          } else if (content[i] === '}') {
            bracketCount--;
            if (inFunction && bracketCount === 0) {
              position = i + 1;
              break;
            }
          }
        }
      }
      
      // If we couldn't find a good position, try a different approach - just look for a specific pattern
      if (position === -1) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('_interopRequireDefault') && !lines[i-1]?.includes('PATCHED')) {
            // Insert after this line
            lines.splice(i + 1, 0, injectedCode);
            content = lines.join('\n');
            console.log(`✅ Injected patch to module.compiled.js`);
            patchedFiles++;
            break;
          }
        }
      } else {
        // Insert at the calculated position
        content = content.substring(0, position) + injectedCode + content.substring(position);
        fs.writeFileSync(modulePath, content, 'utf8');
        console.log(`✅ Injected patch to module.compiled.js at position ${position}`);
        patchedFiles++;
      }
    }
  }
} catch (err) {
  console.error(`❌ Error with special module.compiled.js patch:`, err.message);
  failedFiles++;
}

// Now let's find all instances of interopRequireDefault.js in node_modules
try {
  console.log('🔍 Searching for other instances of interopRequireDefault.js...');
  
  function findFiles(dir, pattern, callback) {
    if (!fs.existsSync(dir)) return;
    
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        try {
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Skip node_modules inside node_modules to avoid infinite recursion
            if (filePath.includes('node_modules') && 
                filePath.split(path.sep + 'node_modules' + path.sep).length > 2) {
              continue;
            }
            
            // Skip .next directory - we'll handle it separately
            if (filePath.includes('.next')) {
              continue;
            }
            
            findFiles(filePath, pattern, callback);
          } else if (file === pattern || file.includes(pattern)) {
            callback(filePath);
          }
        } catch (err) {
          // Silently ignore permission errors
        }
      }
    } catch (err) {
      // Silently ignore permission errors
    }
  }
  
  findFiles('./node_modules', 'interopRequireDefault', (filePath) => {
    try {
      // Skip files we've already processed
      if (possiblePaths.some(p => path.resolve(p) === filePath)) {
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Only patch if it looks like the helper file we need and isn't already patched
      if (needsPatching(content)) {
        console.log(`📝 Patching additional file: ${filePath}`);
        
        // Create a backup
        fs.writeFileSync(`${filePath}.backup`, content, 'utf8');
        
        // Write the patched version
        fs.writeFileSync(filePath, patchContent, 'utf8');
        console.log(`✅ Successfully patched ${filePath}`);
        patchedFiles++;
      }
    } catch (err) {
      // Silently ignore permission errors
    }
  });
} catch (err) {
  console.error(`❌ Error searching for additional files:`, err.message);
}

// Final report
console.log('\n📊 Patching report:');
console.log(`   - Files patched: ${patchedFiles}`);
console.log(`   - Failed patches: ${failedFiles}`);

if (patchedFiles > 0) {
  console.log('\n🎉 Successfully applied patches! Run the app with:');
  console.log('   npm run dev');
} else if (failedFiles > 0) {
  console.log('\n⚠️ No files were patched, but errors occurred. Try running:');
  console.log('   rm -rf .next && npm run dev');
} else {
  console.log('\n✅ No patches needed or all files already patched. Run the app with:');
  console.log('   npm run dev');
}

console.log(''); 