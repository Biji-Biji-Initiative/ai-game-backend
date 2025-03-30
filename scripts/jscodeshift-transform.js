#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { glob } from 'glob';
import chalk from 'chalk';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Create a transform file for JSCodeshift
const transformFilePath = path.join(__dirname, 'esm-transform.js');
const transformContent = `
/**
 * This transform converts CommonJS modules to ES modules.
 * It handles:
 * - require() to import statements
 * - module.exports to export statements
 * - Adding .js extensions to local imports
 * - Converting dynamic requires to dynamic imports
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Convert require statements to import statements
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      // Skip dynamic requires for now (we'll handle them separately)
      if (path.node.arguments[0].type !== 'Literal') return;

      const modulePath = path.node.arguments[0].value;
      let importPath = modulePath;
      
      // Add .js extension to relative paths if missing
      if (
        (modulePath.startsWith('./') || modulePath.startsWith('../')) && 
        !path.value.arguments[0].value.match(/\\.(js|json|mjs)$/)
      ) {
        importPath = \`\${modulePath}.js\`;
      }

      // Simple require
      if (
        path.parent.node.type === 'VariableDeclarator' &&
        path.parent.node.id.type === 'Identifier'
      ) {
        const defaultImport = j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier(path.parent.node.id.name))],
          j.literal(importPath)
        );
        
        // Replace the variable declaration with import
        j(path.parent.parent).replaceWith(defaultImport);
      }
      
      // Destructured require
      else if (
        path.parent.node.type === 'VariableDeclarator' &&
        path.parent.node.id.type === 'ObjectPattern'
      ) {
        const importSpecifiers = path.parent.node.id.properties.map(prop => {
          // Handle aliased imports { originalName: aliasName }
          if (prop.value && prop.key.name !== prop.value.name) {
            return j.importSpecifier(
              j.identifier(prop.key.name),
              j.identifier(prop.value.name)
            );
          }
          // Handle regular imports { name }
          return j.importSpecifier(j.identifier(prop.key.name));
        });
        
        const importDecl = j.importDeclaration(
          importSpecifiers,
          j.literal(importPath)
        );
        
        j(path.parent.parent).replaceWith(importDecl);
      }
    });

  // Convert module.exports = ... to export default ...
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { name: 'module' },
        property: { name: 'exports' }
      }
    })
    .forEach(path => {
      // module.exports = { ... } with object literal - convert to named exports
      if (path.node.right.type === 'ObjectExpression') {
        const exportStatements = path.node.right.properties.map(prop => {
          if (prop.type === 'Property') {
            if (prop.key.name === prop.value.name) {
              // For shorthand { foo } syntax
              return j.exportNamedDeclaration(
                null,
                [j.exportSpecifier(j.identifier(prop.key.name))]
              );
            } else {
              // Regular property { foo: bar }
              return j.exportNamedDeclaration(
                j.variableDeclaration('const', [
                  j.variableDeclarator(
                    j.identifier(prop.key.name),
                    prop.value
                  )
                ])
              );
            }
          }
          return null;
        }).filter(Boolean);
        
        j(path.parent).replaceWith(exportStatements);
      } else {
        // Regular module.exports = someValue
        j(path.parent).replaceWith(
          j.exportDefaultDeclaration(path.node.right)
        );
      }
    });

  // Convert exports.foo = bar to export const foo = bar
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { name: 'exports' },
      }
    })
    .forEach(path => {
      const exportName = path.node.left.property.name;
      
      j(path.parent).replaceWith(
        j.exportNamedDeclaration(
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(exportName),
              path.node.right
            )
          ])
        )
      );
    });

  // Convert dynamic requires to dynamic imports
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      // Only process dynamic requires where the argument is not a string literal
      if (path.node.arguments[0].type === 'Literal') return;
      
      // Create import() call
      const importCall = j.callExpression(
        j.import(),
        path.node.arguments
      );
      
      // Replace require() with import()
      j(path).replaceWith(importCall);
    });

  // Add missing 'export' keywords to function declarations at the top level
  root
    .find(j.FunctionDeclaration)
    .filter(path => path.parent.node.type === 'Program')
    .forEach(path => {
      // Check if this function is already being exported via other means
      const functionName = path.node.id.name;
      const isAlreadyExported = root
        .find(j.ExportSpecifier, { exported: { name: functionName } })
        .size() > 0;
      
      if (!isAlreadyExported) {
        j(path).replaceWith(
          j.exportNamedDeclaration(path.node)
        );
      }
    });

  return root.toSource({
    quote: 'single',
    trailingComma: true
  });
}
`;

/**
 * Create the transform file
 */
async function createTransformFile() {
  try {
    await fs.promises.writeFile(transformFilePath, transformContent, 'utf8');
    console.log(chalk.green(`✓ Created transform file at ${transformFilePath}`));
    return transformFilePath;
  } catch (error) {
    console.error(chalk.red(`Error creating transform file: ${error.message}`));
    throw error;
  }
}

/**
 * Run JSCodeshift on a specific file
 * @param {string} filePath - Path to the file to transform
 * @param {string} transformPath - Path to the transform file
 * @returns {Promise<void>}
 */
async function runJSCodeshift(filePath, transformPath) {
  console.log(chalk.blue(`Transforming ${filePath}...`));
  
  return new Promise((resolve, reject) => {
    const jscodeshift = spawn('npx', [
      'jscodeshift',
      '--extensions=js',
      '--parser=babel',
      '--transform', transformPath,
      filePath
    ]);
    
    jscodeshift.stdout.on('data', (data) => {
      console.log(chalk.gray(data.toString()));
    });
    
    jscodeshift.stderr.on('data', (data) => {
      console.error(chalk.red(data.toString()));
    });
    
    jscodeshift.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✓ Successfully transformed ${filePath}`));
        resolve();
      } else {
        console.error(chalk.red(`✗ Failed to transform ${filePath} with code ${code}`));
        reject(new Error(`Transform failed with code ${code}`));
      }
    });
  });
}

/**
 * Find all JavaScript files
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findJSFiles() {
  const ignoreDirs = [
    'node_modules',
    '.git',
    'disabled_scripts',
    'tests',
    'coverage',
    'logs',
    'api-tester-ui',
    'supabase'
  ];
  
  const ignorePattern = `**/{${ignoreDirs.join(',')}}/**`;
  
  return glob('**/*.js', {
    cwd: rootDir,
    ignore: [ignorePattern, 'eslint.config.js', 'jest.*.js', 'scripts/esm-transform.js'],
    absolute: true
  });
}

/**
 * Main function to run the transformation
 */
async function main() {
  try {
    console.log(chalk.yellow('Starting JSCodeshift transformations...'));
    
    // Step 1: Create the transform file
    const transformPath = await createTransformFile();
    
    // Step 2: Find JS files
    console.log(chalk.yellow('Finding JS files...'));
    const allFiles = await findJSFiles();
    console.log(chalk.blue(`Found ${allFiles.length} JS files to transform`));
    
    // Step 3: Transform each file
    console.log(chalk.yellow('Transforming files to ES Modules...'));
    
    // Transform files in batches to avoid system resource issues
    const batchSize = 5;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(file => runJSCodeshift(file, transformPath)));
      console.log(chalk.blue(`Transformed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allFiles.length / batchSize)}`));
    }
    
    console.log(chalk.green('JSCodeshift transformations completed successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.yellow('1. Run tests to verify everything still works'));
    console.log(chalk.yellow('2. Fix any remaining ESLint errors'));
    console.log(chalk.yellow('3. Check for any issues with circular dependencies'));
    
  } catch (error) {
    console.error(chalk.red(`Transformation failed: ${error.message}`));
    process.exit(1);
  }
}

main(); 