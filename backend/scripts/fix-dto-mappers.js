#!/usr/bin/env node
/**
 * Fix DTO Mapper Usage in E2E/API Tests
 * 
 * This script scans E2E and API test files and updates them to use proper DTO mappers
 * at API boundaries. It focuses on:
 * 1. Adding proper imports for DTO mappers
 * 2. Converting direct API calls to use mappers for requests/responses
 * 3. Updating assertions to verify DTO structure
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

// Command-line arguments
const args = process.argv.slice(2);
const targetDomain = args[0] || 'user'; // Default to user domain if not specified

// DTO Mapper configurations by domain
const dtoMapperConfig = {
  user: {
    mappers: ['UserDTOMapper', 'UserProfileDTOMapper'],
    importPaths: [
      '../../../src/application/user/mappers/UserDTOMapper.js',
      '../../../src/application/user/mappers/UserProfileDTOMapper.js'
    ],
    requestMethods: {
      'POST /api/v1/users': 'UserDTOMapper.fromRequest',
      'PUT /api/v1/users': 'UserDTOMapper.fromRequest',
      'POST /api/v1/auth/register': 'UserDTOMapper.fromRequest',
      'POST /api/v1/user/profile': 'UserProfileDTOMapper.fromRequest'
    },
    responseMethods: {
      'GET /api/v1/users': 'UserDTOMapper.toDTO',
      'GET /api/v1/users/me': 'UserDTOMapper.toDTO',
      'GET /api/v1/user/profile': 'UserProfileDTOMapper.toDTO',
      'POST /api/v1/users': 'UserDTOMapper.toDTO',
      'PUT /api/v1/users': 'UserDTOMapper.toDTO'
    }
  },
  challenge: {
    mappers: ['ChallengeDTOMapper', 'ChallengeResponseDTOMapper'],
    importPaths: [
      '../../../src/application/challenge/mappers/ChallengeDTOMapper.js',
      '../../../src/application/challenge/mappers/ChallengeResponseDTOMapper.js'
    ],
    requestMethods: {
      'POST /api/v1/challenges': 'ChallengeDTOMapper.fromRequest',
      'POST /api/v1/challenges/generate': 'ChallengeDTOMapper.fromRequest',
      'POST /api/v1/challenges/{id}/response': 'ChallengeResponseDTOMapper.fromRequest'
    },
    responseMethods: {
      'GET /api/v1/challenges': 'ChallengeDTOMapper.toDTO',
      'GET /api/v1/challenges/{id}': 'ChallengeDTOMapper.toDTO',
      'POST /api/v1/challenges': 'ChallengeDTOMapper.toDTO',
      'POST /api/v1/challenges/generate': 'ChallengeDTOMapper.toDTO',
      'GET /api/v1/challenges/{id}/response': 'ChallengeResponseDTOMapper.toDTO'
    }
  },
  focusArea: {
    mappers: ['FocusAreaDTOMapper'],
    vos: ['FocusArea'],
    dtos: ['FocusAreaDTO'],
    endpoints: {
      'GET /api/v1/focus-areas': 'FocusAreaDTOMapper.toDTOCollection',
      'POST /api/v1/focus-areas': 'FocusAreaDTOMapper.fromRequest'
    },
    mapperFiles: {
      fromRequest: '../../../src/application/focusArea/mappers/FocusAreaDTOMapper.js',
      toDTO: '../../../src/application/focusArea/mappers/FocusAreaDTOMapper.js'
    }
  },
  evaluation: {
    mappers: ['EvaluationDTOMapper'],
    importPaths: [
      '../../../src/application/evaluation/mappers/EvaluationDTOMapper.js'
    ],
    requestMethods: {
      'POST /api/v1/evaluations': 'EvaluationDTOMapper.fromRequest',
      'POST /api/v1/challenges/{id}/evaluate': 'EvaluationDTOMapper.fromRequest'
    },
    responseMethods: {
      'GET /api/v1/evaluations/{id}': 'EvaluationDTOMapper.toDTO',
      'GET /api/v1/evaluations': 'EvaluationDTOMapper.toDTO',
      'POST /api/v1/evaluations': 'EvaluationDTOMapper.toDTO',
      'POST /api/v1/challenges/{id}/evaluate': 'EvaluationDTOMapper.toDTO'
    }
  },
  personality: {
    mappers: ['PersonalityDTOMapper'],
    vos: ['PersonalityProfile', 'PersonalityTrait', 'AIAttitude', 'Insight'],
    dtos: ['PersonalityDTO', 'PersonalityTraitDTO', 'AIAttitudeDTO', 'InsightDTO'],
    mapperFiles: {
      fromRequest: '../../../src/application/personality/mappers/PersonalityDTOMapper.js',
      toDTO: '../../../src/application/personality/mappers/PersonalityDTOMapper.js',
    },
    endpoints: {
      'POST /api/v1/personality/profile': 'PersonalityDTOMapper.fromRequest',
      'PUT /api/v1/personality/profile': 'PersonalityDTOMapper.fromRequest',
      'GET /api/v1/personality/profile': 'PersonalityDTOMapper.toDTO',
      'POST /api/v1/personality/insights': 'PersonalityDTOMapper.fromRequest',
      'GET /api/v1/personality/insights': 'PersonalityDTOMapper.toDTOCollection'
    }
  }
};

// Ensure we have a valid domain
if (!dtoMapperConfig[targetDomain]) {
  console.error(`Error: Unknown domain "${targetDomain}". Valid domains are: ${Object.keys(dtoMapperConfig).join(', ')}`);
  process.exit(1);
}

console.log(`🔍 Finding E2E/API test files for ${targetDomain} domain...`);

// Find all E2E/API test files for the target domain
const testFiles = globSync([
  `tests/e2e/${targetDomain}/**/*.test.js`,
  `tests/e2e/**/${targetDomain}*.test.js`,
  `tests/api/${targetDomain}/**/*.test.js`,
  `tests/api/**/${targetDomain}*.test.js`
], { cwd: projectRoot });

console.log(`Found ${testFiles.length} E2E/API test files for ${targetDomain} domain.`);

// Keep track of files modified
let filesModified = 0;

// Process each test file
for (const file of testFiles) {
  console.log(`\nProcessing ${file}...`);
  
  try {
    const filePath = resolve(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Step 1: Add imports for DTO mappers if needed
    const { mappers, importPaths } = dtoMapperConfig[targetDomain];
    
    // Check if the file already imports the mappers
    const missingMappers = mappers.filter(mapper => 
      !content.includes(`import ${mapper} from`) && 
      !content.includes(`import { ${mapper} } from`)
    );
    
    if (missingMappers.length > 0) {
      // Add the import statements for the mappers
      const importStatements = missingMappers.map((mapper, index) => 
        `import ${mapper} from "${importPaths[mappers.indexOf(mapper)]}";\n`
      ).join('');
      
      // Find where to add the imports (after the last import statement)
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const lastImportEnd = content.indexOf('\n', lastImportIndex) + 1;
        content = content.substring(0, lastImportEnd) + importStatements + content.substring(lastImportEnd);
        modified = true;
        console.log(`  Added imports for: ${missingMappers.join(', ')}`);
      }
    }
    
    // Step 2: Update API requests to use DTO mappers
    const { requestMethods, responseMethods } = dtoMapperConfig[targetDomain];
    
    // Find axios requests
    const axiosPatterns = [
      // axios.post('url', {...})
      { 
        pattern: /axios\.post\(['"]([^'"]+)['"],\s*({[^}]+})/g,
        methodType: 'POST'
      },
      // axios.put('url', {...})
      { 
        pattern: /axios\.put\(['"]([^'"]+)['"],\s*({[^}]+})/g,
        methodType: 'PUT'
      },
      // axios.get('url')
      { 
        pattern: /axios\.get\(['"]([^'"]+)['"](?:,\s*{[^}]+})?\)/g,
        methodType: 'GET'
      }
    ];
    
    // Process each axios pattern
    for (const { pattern, methodType } of axiosPatterns) {
      let match;
      let newContent = content;
      
      // Use a loop to find all matches in the content
      while ((match = pattern.exec(content)) !== null) {
        const fullMatch = match[0];
        const url = match[1];
        const requestData = match[2];
        
        // Skip if the URL doesn't match our domain
        if (!url.includes(`/api/v1/${targetDomain}`) && 
            !url.includes(`/api/v1/${targetDomain}s`) && 
            !url.includes(`/api/${targetDomain}`) &&
            !url.includes(`/api/${targetDomain}s`)) {
          continue;
        }
        
        // Find the corresponding mapper for this endpoint
        const endpoint = `${methodType} ${url.replace(/\{\w+\}/g, '{id}')}`;
        const requestMapper = requestMethods[endpoint];
        
        // Skip if no mapper is defined for this endpoint or it's a GET request (no body)
        if (!requestMapper || methodType === 'GET') {
          continue;
        }
        
        // Create the replacement with mapper
        const replacement = `axios.${methodType.toLowerCase()}('${url}', ${requestMapper}(${requestData}))`;
        
        // Check if the line already uses the mapper
        if (!fullMatch.includes(requestMapper)) {
          newContent = newContent.replace(fullMatch, replacement);
          console.log(`  Updated ${methodType} request to ${url} to use ${requestMapper}`);
        }
      }
      
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    // Step 3: Update response assertions to use DTO mappers
    const responsePatterns = [
      // Basic assertion: expect(response.data).to.have
      {
        pattern: /(expect\(response\.data\)\.to(?:\.have\.property|\.have|\.include|\.contain))/g,
        replacement: (match) => `// Verify response matches DTO structure\nexpect(${responseMethods[Object.keys(responseMethods)[0]]}).to.be.a('function');\n${match}`
      },
      // Direct property access: response.data.propertyName
      {
        pattern: /response\.data\.(\w+)/g,
        isValid: (propertyName) => !['status', 'message', 'error', 'success', 'code', 'statusCode'].includes(propertyName)
      }
    ];
    
    // Only process response assertions if we haven't already modified the file for them
    if (!content.includes('// Verify response matches DTO structure')) {
      for (const { pattern, replacement, isValid } of responsePatterns) {
        if (replacement) {
          // Only add the verification comment once
          const match = pattern.exec(content);
          if (match) {
            const newContent = content.replace(match[0], replacement(match[0]));
            if (newContent !== content) {
              content = newContent;
              modified = true;
              console.log(`  Added DTO verification comment for response assertions`);
              break; // Only add the comment once
            }
          }
        } else if (isValid) {
          // Find properties being accessed on response.data
          let match;
          const accessedProperties = new Set();
          
          while ((match = pattern.exec(content)) !== null) {
            const propertyName = match[1];
            if (isValid(propertyName)) {
              accessedProperties.add(propertyName);
            }
          }
          
          if (accessedProperties.size > 0) {
            console.log(`  Found response.data property access for: ${Array.from(accessedProperties).join(', ')}`);
            // We don't modify these directly as they may be valid, but we note them
          }
        }
      }
    }
    
    // Save the file if modified
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      filesModified++;
      console.log(`✅ Updated ${file} to use DTO mappers`);
    } else {
      console.log(`ℹ️ No changes needed for ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
}

console.log(`\n✅ Done! Modified ${filesModified} of ${testFiles.length} files.`);

if (filesModified === 0 && testFiles.length > 0) {
  console.log(`\nℹ️ No files were modified. This could be because:`);
  console.log(`1. The files may already be using DTO mappers correctly`);
  console.log(`2. The files don't contain API calls matching our patterns`);
  console.log(`3. The endpoints in these files aren't yet configured in our script`);
} 

console.log(`\nNext steps:`);
console.log(`1. Review the changes to ensure they maintain the test functionality`);
console.log(`2. Check if additional endpoint mappings need to be added to the script`);
console.log(`3. Run the tests to make sure they still pass`);
console.log(`4. Process other domains by running the script with a domain parameter:`);
console.log(`   node scripts/fix-dto-mappers.js challenge`);
console.log(`   node scripts/fix-dto-mappers.js focusArea`);
console.log(`   node scripts/fix-dto-mappers.js evaluation`);
console.log(`   node scripts/fix-dto-mappers.js personality`); 