#!/usr/bin/env node

/**
 * This script patches the Next.js app-router.js file to fix the error with
 * use client directives in error-boundary.js and related components
 */
const fs = require('fs');
const path = require('path');

// App router path
const appRouterPath = path.join(
  process.cwd(),
  'frontend/node_modules/next/dist/client/components/app-router.js'
);

// Error boundary path
const errorBoundaryPath = path.join(
  process.cwd(),
  'frontend/node_modules/next/dist/client/components/error-boundary.js'
);

function patchFile(filePath, processFn) {
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const processedContent = processFn(content);
    
    if (content !== processedContent) {
      fs.writeFileSync(filePath, processedContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Patch app-router.js to avoid importing error-boundary with patching code
const patchAppRouter = () => {
  return patchFile(appRouterPath, (content) => {
    // If it includes error boundary imports, remove them and add them manually
    if (content.includes('error-boundary')) {
      console.log('Patching app-router.js...');
      
      // Strip any problematic imports
      const newContent = content
        .replace(/import [^;]+ from (['"])\.\/error-boundary\.js\1;?/g, '/* Patched error-boundary import */')
        .replace(/(\/\/ omitted for brevity)/, '$1\n\n// Manual import of error boundary\nconst ErrorBoundary = { default: function() { return null; }, ErrorBoundary: function() { return null; } };');
      
      console.log('✓ Successfully patched app-router.js');
      return newContent;
    }
    return content;
  });
};

// Patch error-boundary.js to ensure use client is at the top
const patchErrorBoundary = () => {
  return patchFile(errorBoundaryPath, (content) => {
    if (!content.startsWith("'use client';")) {
      console.log('Patching error-boundary.js...');
      
      // Ensure 'use client' is at the top
      const newContent = "'use client';\n" + content.replace(/'use client';?/g, '');
      
      console.log('✓ Successfully patched error-boundary.js');
      return newContent;
    }
    return content;
  });
};

// Run the patches
const appRouterPatched = patchAppRouter();
const errorBoundaryPatched = patchErrorBoundary();

if (!appRouterPatched && !errorBoundaryPatched) {
  console.log('No patches were necessary or patches did not succeed.');
} else {
  console.log('Patches applied successfully. Please restart your application.');
} 