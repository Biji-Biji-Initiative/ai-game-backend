/**
 * Find Dependency Injection Issues in Tests
 * 
 * This script scans test files for dependency injection issues, such as:
 * 1. Usage of proxyquire or jest.mock instead of constructor injection
 * 2. Direct imports of dependencies instead of mock injection
 * 3. Missing proper instantiation of classes under test
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Finding tests with dependency injection issues...');

// Find all JavaScript test files in domain and unit directories
const testFiles = globSync(['tests/domain/**/*.test.js', 'tests/unit/**/*.test.js'], { cwd: projectRoot });

// Patterns to look for
const patterns = [
  // proxyquire usage
  { 
    pattern: /proxyquire/g, 
    description: 'Using proxyquire instead of constructor injection' 
  },
  // jest.mock usage
  { 
    pattern: /jest\.mock/g, 
    description: 'Using jest.mock instead of constructor injection' 
  },
  // sinon.stub direct usage without constructor injection
  { 
    pattern: /sinon\.stub\(\w+,\s*['"]\w+['"]\)/g, 
    description: 'Stubbing dependencies directly instead of using constructor injection' 
  },
  // new ClassName() without passing dependencies
  { 
    pattern: /new\s+\w+\(\s*\)/g, 
    description: 'Instantiating class without passing dependencies' 
  },
  // require() usage in tests
  { 
    pattern: /require\(['"]\.\.\//g, 
    description: 'Using require() in tests' 
  }
];

// Results storage
const results = [];

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  let content;
  
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${file}: ${error.message}`);
    continue;
  }
  
  const fileResults = [];
  
  // Check each pattern
  for (const { pattern, description } of patterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Find context for the matches
      const lines = content.split('\n');
      const matchLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        for (const match of matches) {
          if (lines[i].includes(match)) {
            // Get some context (a few lines before and after)
            const startLine = Math.max(0, i - 2);
            const endLine = Math.min(lines.length - 1, i + 2);
            const contextLines = [];
            
            for (let j = startLine; j <= endLine; j++) {
              contextLines.push({
                line: j + 1,
                content: lines[j],
                isMatch: j === i
              });
            }
            
            matchLines.push({
              line: i + 1,
              content: lines[i],
              context: contextLines
            });
            break;
          }
        }
      }
      
      if (matchLines.length > 0) {
        fileResults.push({
          description,
          count: matches.length,
          lines: matchLines
        });
      }
    }
  }
  
  // Check if we found DI pattern in the file
  const hasDIPattern = content.includes('constructor(') && 
                       (content.includes('inject') || 
                        content.match(/new\s+\w+\(\s*\{/) || 
                        content.match(/new\s+\w+\(\s*[^{]*mock/));
  
  if (fileResults.length > 0) {
    results.push({
      file,
      matches: fileResults,
      hasDIPattern
    });
  }
}

// Print results
console.log('\n-------------------------------------------------');
console.log('Test Files with Dependency Injection Issues');
console.log('-------------------------------------------------');

// Group results by those that need attention (no DI pattern) and those that might be fine
const needsAttention = results.filter(r => !r.hasDIPattern);
const mightBeFine = results.filter(r => r.hasDIPattern);

console.log(`\n⚠️ Files that need immediate attention (${needsAttention.length}):`);
needsAttention.forEach(({ file, matches }) => {
  console.log(`\n📝 ${file}`);
  matches.forEach(({ description, count, lines }) => {
    console.log(`  - ${description}: ${count} matches`);
    lines.forEach(({ line, content }) => {
      console.log(`    Line ${line}: ${content.length > 100 ? content.substring(0, 100) + '...' : content}`);
    });
  });
});

console.log(`\n⚠️ Files to verify (may already use DI but need checking) (${mightBeFine.length}):`);
mightBeFine.forEach(({ file, matches }) => {
  console.log(`\n📝 ${file}`);
  matches.forEach(({ description, count, lines }) => {
    console.log(`  - ${description}: ${count} matches`);
    lines.forEach(({ line, content }) => {
      console.log(`    Line ${line}: ${content.length > 100 ? content.substring(0, 100) + '...' : content}`);
    });
  });
});

console.log('\n\n✅ Analysis complete!');
console.log(`Found ${results.length} files with potential dependency injection issues.`);
console.log(`${needsAttention.length} need immediate attention.`);
console.log(`${mightBeFine.length} should be verified.`);

// Print DI guidelines
console.log('\n-------------------------------------------------');
console.log('Dependency Injection Guidelines');
console.log('-------------------------------------------------');
console.log(`
Proper DI pattern for tests:

1. Create mocks for dependencies:
   const mockUserRepository = { findById: sinon.stub() };
   const mockEventBus = { publish: sinon.stub() };

2. Pass mocks via constructor:
   const userService = new UserService({
     userRepository: mockUserRepository,
     eventBus: mockEventBus
   });

3. Set up stubs for specific test:
   mockUserRepository.findById.resolves({ id: '123', name: 'Test User' });

4. Call the method under test:
   const result = await userService.getUserById('123');

5. Assert on both the result and interactions:
   expect(result.name).to.equal('Test User');
   expect(mockUserRepository.findById.calledWith('123')).to.be.true;
`); 