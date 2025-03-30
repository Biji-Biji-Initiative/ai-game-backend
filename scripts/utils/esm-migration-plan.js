#!/usr/bin/env node

/**
 * ESM Migration Plan
 * 
 * This script helps analyze and migrate the codebase from CommonJS to ES Modules.
 * 
 * Usage:
 *   node scripts/utils/esm-migration-plan.js analyze
 *   node scripts/utils/esm-migration-plan.js migrate [file]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import chalk from 'chalk';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Regex patterns to detect module syntax
const REQUIRE_PATTERN = /require\s*\(\s*["']([@\w\d\/\.-]+)["']\s*\)/g;
const MODULE_EXPORTS_PATTERN = /module\.exports\s*=/g;
const EXPORTS_PATTERN = /exports\.\w+\s*=/g;
const IMPORT_PATTERN = /import\s+.*\s+from\s+["']([@\w\d\/\.-]+)["']/g;
const EXPORT_PATTERN = /export\s+(default|const|let|var|function|class)\s+/g;
const DYNAMIC_REQUIRE_PATTERN = /require\s*\(\s*[^"'][^)]*\)/g;
const DIRNAME_FILENAME_PATTERN = /(__dirname|__filename)/g;

// Directories to ignore
const ignoreDirs = [
  'node_modules',
  '.git',
  'disabled_scripts',
  'coverage',
  'logs',
  'api-tester-ui',
  'supabase'
];

/**
 * Analyze a file for module syntax
 * @param {string} filePath - Path to the file to analyze
 * @returns {Object} - Analysis results
 */
async function analyzeFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    
    const requires = [...content.matchAll(REQUIRE_PATTERN)];
    const moduleExports = [...content.matchAll(MODULE_EXPORTS_PATTERN)];
    const exportsProps = [...content.matchAll(EXPORTS_PATTERN)];
    const imports = [...content.matchAll(IMPORT_PATTERN)];
    const exports = [...content.matchAll(EXPORT_PATTERN)];
    const dynamicRequires = [...content.matchAll(DYNAMIC_REQUIRE_PATTERN)];
    const dirnameFilename = [...content.matchAll(DIRNAME_FILENAME_PATTERN)];
    
    const hasCjs = requires.length > 0 || moduleExports.length > 0 || exportsProps.length > 0;
    const hasEsm = imports.length > 0 || exports.length > 0;
    const hasMixedSyntax = hasCjs && hasEsm;
    
    return {
      filePath,
      requires: requires.length,
      moduleExports: moduleExports.length,
      exportsProps: exportsProps.length,
      imports: imports.length,
      exports: exports.length,
      dynamicRequires: dynamicRequires.length,
      dirnameFilename: dirnameFilename.length,
      hasCjs,
      hasEsm,
      hasMixedSyntax,
      moduleType: hasMixedSyntax ? 'mixed' : (hasCjs ? 'cjs' : (hasEsm ? 'esm' : 'empty'))
    };
  } catch (error) {
    console.error(chalk.red(`Error analyzing file ${filePath}: ${error.message}`));
    return {
      filePath,
      error: error.message,
      moduleType: 'error'
    };
  }
}

/**
 * Find all JavaScript files
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findJSFiles() {
  const ignorePattern = `**/{${ignoreDirs.join(',')}}/**`;
  
  return glob('**/*.js', {
    cwd: rootDir,
    ignore: [ignorePattern, 'eslint.config.js'],
    absolute: true
  });
}

/**
 * Sort files by a specific criterion
 * @param {Array} files - Array of file analysis results
 * @param {string} criterion - The criterion to sort by
 * @returns {Array} - Sorted files
 */
function sortFiles(files, criterion) {
  return [...files].sort((a, b) => {
    if (criterion === 'dependencies') {
      return (a.requires + a.imports) - (b.requires + b.imports);
    } else if (criterion === 'exports') {
      return (a.moduleExports + a.exportsProps + a.exports) - (b.moduleExports + b.exportsProps + b.exports);
    } else if (criterion === 'complexity') {
      return (a.dynamicRequires + a.dirnameFilename) - (b.dynamicRequires + b.dirnameFilename);
    }
    return 0;
  });
}

/**
 * Identify "leaf" files that are good candidates for early migration
 * @param {Array} files - Array of file analysis results
 * @returns {Array} - Leaf files
 */
function identifyLeafFiles(files) {
  // Files with few or no dependencies but many exports are good candidates
  return files.filter(file => 
    file.hasCjs && 
    (file.requires + file.imports) <= 3 && 
    (file.moduleExports + file.exportsProps) > 0 &&
    file.dynamicRequires === 0 &&
    file.dirnameFilename === 0
  );
}

/**
 * Generate an ESM migration plan report
 * @param {Array} files - Array of file analysis results
 * @returns {string} - Report text
 */
function generateReport(files) {
  // Basic stats
  const totalFiles = files.length;
  const cjsFiles = files.filter(f => f.moduleType === 'cjs').length;
  const esmFiles = files.filter(f => f.moduleType === 'esm').length;
  const mixedFiles = files.filter(f => f.moduleType === 'mixed').length;
  const emptyFiles = files.filter(f => f.moduleType === 'empty').length;
  
  const totalRequires = files.reduce((sum, f) => sum + f.requires, 0);
  const totalModuleExports = files.reduce((sum, f) => sum + f.moduleExports, 0);
  const totalExportsProps = files.reduce((sum, f) => sum + f.exportsProps, 0);
  const totalImports = files.reduce((sum, f) => sum + f.imports, 0);
  const totalExports = files.reduce((sum, f) => sum + f.exports, 0);
  const totalDynamicRequires = files.reduce((sum, f) => sum + f.dynamicRequires, 0);
  const totalDirnameFilename = files.reduce((sum, f) => sum + f.dirnameFilename, 0);
  
  // Identify leaf files
  const leafFiles = identifyLeafFiles(files);
  
  // Build the report
  let report = `# ESM Migration Analysis Report\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Total JS Files**: ${totalFiles}\n`;
  report += `- **CommonJS Files**: ${cjsFiles}\n`;
  report += `- **ES Module Files**: ${esmFiles}\n`;
  report += `- **Mixed Syntax Files**: ${mixedFiles}\n`;
  report += `- **Empty/Other Files**: ${emptyFiles}\n\n`;
  
  report += `## Module Usage\n\n`;
  report += `- **require() statements**: ${totalRequires}\n`;
  report += `- **module.exports statements**: ${totalModuleExports}\n`;
  report += `- **exports.x statements**: ${totalExportsProps}\n`;
  report += `- **import statements**: ${totalImports}\n`;
  report += `- **export statements**: ${totalExports}\n\n`;
  
  report += `## Migration Challenges\n\n`;
  report += `- **Files with dynamic requires**: ${files.filter(f => f.dynamicRequires > 0).length} (${totalDynamicRequires} instances)\n`;
  report += `- **Files using __dirname/__filename**: ${files.filter(f => f.dirnameFilename > 0).length} (${totalDirnameFilename} instances)\n\n`;
  
  report += `## Recommended Migration Candidates\n\n`;
  report += `The following ${leafFiles.length} files are good candidates for early migration:\n\n`;
  
  leafFiles.forEach(file => {
    const relativePath = path.relative(rootDir, file.filePath);
    report += `- \`${relativePath}\` (${file.requires} requires, ${file.moduleExports + file.exportsProps} exports)\n`;
  });
  
  report += `\n## Migration Progress\n\n`;
  report += `- CommonJS: ${Math.round((cjsFiles / totalFiles) * 100)}%\n`;
  report += `- ES Modules: ${Math.round((esmFiles / totalFiles) * 100)}%\n`;
  report += `- Mixed/In Progress: ${Math.round((mixedFiles / totalFiles) * 100)}%\n\n`;
  
  report += `## Next Steps\n\n`;
  report += `1. Start by migrating the leaf files listed above\n`;
  report += `2. Use the migration scripts to help with the conversion:\n`;
  report += `   - \`npm run migrate:esm:cjstoesm\` - Use cjstoesm for bulk conversion\n`;
  report += `   - \`npm run migrate:esm:jscodeshift\` - Use JSCodeshift for more complex transformations\n`;
  report += `3. After each batch of migrations, run tests to ensure functionality\n`;
  report += `4. Fix ESLint errors with \`npm run migrate:esm:check\`\n\n`;
  
  report += `Report generated on ${new Date().toISOString()}\n`;
  
  return report;
}

/**
 * Save the report to a file
 * @param {string} report - Report content
 * @returns {Promise<string>} - Path to the saved report
 */
async function saveReport(report) {
  const reportDir = path.join(rootDir, 'reports');
  const reportPath = path.join(reportDir, 'esm-migration-report.md');
  
  try {
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportDir)) {
      await fs.promises.mkdir(reportDir, { recursive: true });
    }
    
    await fs.promises.writeFile(reportPath, report, 'utf8');
    console.log(chalk.green(`✓ Report saved to ${reportPath}`));
    return reportPath;
  } catch (error) {
    console.error(chalk.red(`Error saving report: ${error.message}`));
    throw error;
  }
}

/**
 * Main function to run the analysis
 */
async function main() {
  try {
    console.log(chalk.yellow('Starting ESM migration analysis...'));
    
    // Step 1: Find JS files
    console.log(chalk.yellow('Finding JS files...'));
    const allFiles = await findJSFiles();
    console.log(chalk.blue(`Found ${allFiles.length} JS files to analyze`));
    
    // Step 2: Analyze each file
    console.log(chalk.yellow('Analyzing files...'));
    const fileAnalysis = [];
    
    for (const file of allFiles) {
      fileAnalysis.push(await analyzeFile(file));
      
      // Log progress every 100 files
      if (fileAnalysis.length % 100 === 0) {
        console.log(chalk.blue(`Analyzed ${fileAnalysis.length}/${allFiles.length} files`));
      }
    }
    
    // Step 3: Generate and save report
    console.log(chalk.yellow('Generating report...'));
    const report = generateReport(fileAnalysis);
    const reportPath = await saveReport(report);
    
    console.log(chalk.green('\nAnalysis completed successfully!'));
    console.log(chalk.blue(`View the full report at: ${reportPath}`));
    
    // Print summary to console
    const cjsFiles = fileAnalysis.filter(f => f.moduleType === 'cjs').length;
    const esmFiles = fileAnalysis.filter(f => f.moduleType === 'esm').length;
    const leafFiles = identifyLeafFiles(fileAnalysis);
    
    console.log(chalk.yellow('\nSummary:'));
    console.log(chalk.blue(`- Total JS Files: ${allFiles.length}`));
    console.log(chalk.blue(`- CommonJS Files: ${cjsFiles} (${Math.round((cjsFiles / allFiles.length) * 100)}%)`));
    console.log(chalk.blue(`- ES Module Files: ${esmFiles} (${Math.round((esmFiles / allFiles.length) * 100)}%)`));
    console.log(chalk.blue(`- Recommended Migration Candidates: ${leafFiles.length} files`));
    
    console.log(chalk.yellow('\nRecommended next steps:'));
    console.log(chalk.blue('1. Review the full report for detailed information'));
    console.log(chalk.blue('2. Start with the recommended migration candidates'));
    console.log(chalk.blue('3. Use npm run migrate:esm:cjstoesm or npm run migrate:esm:jscodeshift for conversion'));
    
  } catch (error) {
    console.error(chalk.red(`Analysis failed: ${error.message}`));
    process.exit(1);
  }
}

main(); 