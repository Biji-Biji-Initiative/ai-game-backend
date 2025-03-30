/**
 * Markdown Link Checker
 * 
 * This script verifies all links in markdown files within the docs directory:
 * - Internal links to other documentation files
 * - Relative links to resources in the repository
 * - External URLs
 * 
 * Usage:
 *   node link-checker.js [directory_or_file]
 * 
 * If no directory or file is provided, it will check all files in the docs directory
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const fetch = require('node-fetch');

// RegExp for extracting links from markdown
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const MARKDOWN_REFERENCE_LINK_REGEX = /\[([^\]]+)\]:\s*([^\s]+)/g;

// File extensions to check
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

// Root directory of the project
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Statistics
const stats = {
  filesChecked: 0,
  linksChecked: 0,
  brokenLinks: 0,
  validLinks: 0
};

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - Whether file exists
 */
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a path is a file
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - Whether path is a file
 */
async function isFile(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL is reachable
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - Whether URL is reachable
 */
async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Extract all links from a markdown file
 * @param {string} content - Markdown content
 * @returns {Array<{text: string, url: string, line: number}>} - Extracted links
 */
function extractLinks(content) {
  const lines = content.split('\n');
  const links = [];

  // Check inline links [text](url)
  lines.forEach((line, lineNumber) => {
    let match;
    while ((match = MARKDOWN_LINK_REGEX.exec(line)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: lineNumber + 1
      });
    }
  });

  // Check reference links [text]: url
  lines.forEach((line, lineNumber) => {
    let match;
    while ((match = MARKDOWN_REFERENCE_LINK_REGEX.exec(line)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: lineNumber + 1,
        isReference: true
      });
    }
  });

  return links;
}

/**
 * Check if a link is valid
 * @param {Object} link - Link object
 * @param {string} filePath - Path to current file
 * @returns {Promise<{isValid: boolean, reason: string}>} - Validation result
 */
async function validateLink(link, filePath) {
  const { url } = link;
  stats.linksChecked++;

  // Skip fragment-only links
  if (url.startsWith('#')) {
    return { isValid: true, reason: 'fragment-only link' };
  }

  // Check external URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const isValid = await checkUrl(url);
    return {
      isValid,
      reason: isValid ? 'valid external URL' : 'unreachable URL'
    };
  }

  // Check if link has a fragment
  const [linkPath, fragment] = url.split('#');
  const effectiveLinkPath = linkPath || '';

  // Resolve relative links
  const basePath = path.dirname(filePath);
  const resolvedPath = path.resolve(basePath, effectiveLinkPath);

  // Check if file/directory exists
  const exists = await fileExists(resolvedPath);
  
  return {
    isValid: exists,
    reason: exists ? 'valid file path' : 'file not found'
  };
}

/**
 * Check all links in a markdown file
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<Array>} - Array of broken links
 */
async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const links = extractLinks(content);
    const brokenLinks = [];

    for (const link of links) {
      const { isValid, reason } = await validateLink(link, filePath);
      
      if (isValid) {
        stats.validLinks++;
        console.log(`${COLORS.green}✓${COLORS.reset} ${link.url} - ${reason}`);
      } else {
        stats.brokenLinks++;
        console.log(`${COLORS.red}✗${COLORS.reset} ${link.url} - ${reason} (${filePath}:${link.line})`);
        brokenLinks.push({
          file: filePath,
          line: link.line,
          text: link.text,
          url: link.url,
          reason
        });
      }
    }

    return brokenLinks;
  } catch (error) {
    console.error(`${COLORS.red}Error checking file ${filePath}:${COLORS.reset}`, error);
    return [];
  }
}

/**
 * Find all markdown files in a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<Array<string>>} - Paths to markdown files
 */
async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const resolvedPath = path.resolve(dir, entry.name);
    
    // Skip hidden files and directories
    if (entry.name.startsWith('.')) {
      return [];
    }
    
    return entry.isDirectory()
      ? findMarkdownFiles(resolvedPath)
      : MARKDOWN_EXTENSIONS.includes(path.extname(resolvedPath))
        ? [resolvedPath]
        : [];
  }));

  return files.flat();
}

/**
 * Main function
 */
async function main() {
  const targetPath = process.argv[2] || path.resolve(__dirname, '..');
  const resolvedPath = path.resolve(targetPath);
  
  console.log(`${COLORS.cyan}Markdown Link Checker${COLORS.reset}`);
  console.log(`${COLORS.cyan}Checking links in: ${targetPath}${COLORS.reset}`);
  
  try {
    // Check if the target is a file or directory
    const isTargetFile = await isFile(resolvedPath);
    
    let files = [];
    if (isTargetFile) {
      // If it's a markdown file, check it
      if (MARKDOWN_EXTENSIONS.includes(path.extname(resolvedPath))) {
        files = [resolvedPath];
      } else {
        console.log(`${COLORS.yellow}Not a markdown file, skipping: ${resolvedPath}${COLORS.reset}`);
        return;
      }
    } else {
      // If it's a directory, find all markdown files
      files = await findMarkdownFiles(resolvedPath);
    }
    
    const brokenLinksPerFile = {};
    
    console.log(`${COLORS.blue}Found ${files.length} markdown files${COLORS.reset}`);
    
    for (const file of files) {
      console.log(`\n${COLORS.magenta}Checking: ${file}${COLORS.reset}`);
      stats.filesChecked++;
      
      const brokenLinks = await checkFile(file);
      
      if (brokenLinks.length > 0) {
        brokenLinksPerFile[file] = brokenLinks;
      }
    }
    
    // Print summary
    console.log(`\n${COLORS.cyan}Summary:${COLORS.reset}`);
    console.log(`Files checked: ${stats.filesChecked}`);
    console.log(`Links checked: ${stats.linksChecked}`);
    console.log(`Valid links: ${stats.validLinks}`);
    console.log(`Broken links: ${stats.brokenLinks}`);
    
    if (stats.brokenLinks > 0) {
      console.log(`\n${COLORS.red}Broken Links Summary:${COLORS.reset}`);
      
      Object.entries(brokenLinksPerFile).forEach(([file, links]) => {
        console.log(`\n${COLORS.yellow}${file}:${COLORS.reset}`);
        
        links.forEach(link => {
          console.log(`  Line ${link.line}: [${link.text}](${link.url}) - ${link.reason}`);
        });
      });
      
      process.exit(1);
    } else {
      console.log(`\n${COLORS.green}All links are valid!${COLORS.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset}`, error);
    process.exit(1);
  }
}

main(); 