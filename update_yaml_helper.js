// Simple helper to standardize YAML files
// Run: node update_yaml_helper.js [path/to/yaml/file]
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Please provide the path to the YAML file');
  console.error('Usage: node update_yaml_helper.js path/to/yaml/file');
  process.exit(1);
}

const filePath = process.argv[2];
const fileName = path.basename(filePath);

console.log();
let content;
