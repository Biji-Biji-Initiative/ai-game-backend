#!/usr/bin/env node

/**
 * Dependency Analyzer using Madge
 * 
 * This script:
 * 1. Generates a visual dependency graph
 * 2. Checks for circular dependencies
 * 3. Identifies potentially problematic import paths
 */

import madge from 'madge';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES modules fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const appDir = path.resolve(__dirname);
const outputDir = path.join(appDir, 'dependency-analysis');
const indexFile = path.join(appDir, 'src', 'index.js');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function analyzeDependencies() {
  console.log('Starting dependency analysis...');
  
  try {
    // Create the Madge instance
    const dependencyTree = await madge(indexFile, {
      baseDir: appDir,
      fileExtensions: ['js'],
      excludeRegExp: [/node_modules/],
      detectiveOptions: { es6: { mixedImports: true } }
    });
    
    // 1. Generate visual dependency graph
    console.log('Generating dependency graph image...');
    await dependencyTree.image({
      fontSize: '8',
      nodeColor: '#c6c6c6',
      nodeShape: 'box',
      backgroundColor: '#2d2d2d',
      noDependencyColor: '#5dc24c',
      layout: 'dot',
      colors: {
        upstream: '#00758f',
        downstream: '#a36ac7',
      },
      imageFormat: 'svg',
      rankdir: 'LR', // Left to right layout
      outputFilename: path.join(outputDir, 'dependency-graph.svg')
    });
    console.log(`Dependency graph saved to ${path.join(outputDir, 'dependency-graph.svg')}`);
    
    // 2. Check for circular dependencies
    console.log('\nChecking for circular dependencies...');
    const circularDeps = dependencyTree.circular();
    if (circularDeps.length === 0) {
      console.log('✅ No circular dependencies found!');
    } else {
      console.log(`⚠️  Found ${circularDeps.length} circular dependencies:`);
      circularDeps.forEach((cycle, i) => {
        console.log(`\n  Cycle ${i + 1}:`);
        cycle.forEach((module, j) => {
          console.log(`    ${j + 1}. ${module} ${j === cycle.length - 1 ? '→ (back to 1)' : '→'}`);
        });
      });
      
      // Save circular dependencies to file
      fs.writeFileSync(
        path.join(outputDir, 'circular-dependencies.json'),
        JSON.stringify(circularDeps, null, 2)
      );
    }
    
    // 3. Find orphaned modules (not imported by any other module)
    console.log('\nFinding orphaned modules (not imported anywhere)...');
    const orphans = dependencyTree.orphans();
    if (orphans.length === 0) {
      console.log('✅ No orphaned modules found!');
    } else {
      console.log(`ℹ️  Found ${orphans.length} orphaned modules:`);
      orphans.forEach(module => console.log(`  - ${module}`));
    }
    
    // 4. Generate a summary report
    console.log('\nGenerating dependency summary...');
    const summary = {
      totalModules: Object.keys(dependencyTree.obj()).length,
      circularDependencies: circularDeps.length,
      orphanedModules: orphans.length,
      mostDependedOn: findMostDependedOn(dependencyTree),
      largestDependencies: findLargestDependencies(dependencyTree)
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'dependency-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\nDependency analysis complete!');
    console.log(`Reports saved to: ${outputDir}`);
    console.log('\nSummary:');
    console.log(`- Total modules: ${summary.totalModules}`);
    console.log(`- Circular dependencies: ${summary.circularDependencies}`);
    console.log(`- Orphaned modules: ${summary.orphanedModules}`);
    
    if (summary.mostDependedOn.length > 0) {
      console.log('\nMost depended on modules:');
      summary.mostDependedOn.forEach(item => {
        console.log(`  - ${item.module}: ${item.dependents} dependents`);
      });
    }
    
    if (summary.largestDependencies.length > 0) {
      console.log('\nModules with most dependencies:');
      summary.largestDependencies.forEach(item => {
        console.log(`  - ${item.module}: imports ${item.dependencies} modules`);
      });
    }
  
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    process.exit(1);
  }
}

// Helper function to find most depended on modules
function findMostDependedOn(dependencyTree) {
  const dependents = {};
  const tree = dependencyTree.obj();
  
  // Count how many times each module is imported
  Object.keys(tree).forEach(module => {
    tree[module].forEach(dependency => {
      if (!dependents[dependency]) {
        dependents[dependency] = 1;
      } else {
        dependents[dependency]++;
      }
    });
  });
  
  // Sort by number of dependents
  return Object.keys(dependents)
    .map(module => ({ module, dependents: dependents[module] }))
    .sort((a, b) => b.dependents - a.dependents)
    .slice(0, 10);  // Top 10
}

// Helper function to find modules with most dependencies
function findLargestDependencies(dependencyTree) {
  const tree = dependencyTree.obj();
  
  return Object.keys(tree)
    .map(module => ({ module, dependencies: tree[module].length }))
    .sort((a, b) => b.dependencies - a.dependencies)
    .slice(0, 10);  // Top 10
}

// Run the analysis
analyzeDependencies(); 