#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const authYamlPath = path.join(__dirname, "backend", "openapi", "paths", "auth.yaml");
console.log(`Updating ${authYamlPath}...`);
try {
  const content = fs.readFileSync(authYamlPath, "utf8");
  // Replace "success: boolean" with "status: string" in all responses
  let updatedContent = content.replace(/success:\s*\n\s*type:\s*boolean/g, "status:\n            type: string");
