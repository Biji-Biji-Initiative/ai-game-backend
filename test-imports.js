/**
 * Basic test script to verify the imports in our fixed files
 */

// Convert file paths to use relative imports
const paths = {
  dynamicPromptService: './src/core/evaluation/services/dynamicPromptService.js',
  fallbackChallenges: './src/core/common/fallbackChallenges.js'
};

async function testImports() {
  console.log('Testing imports in fixed files...');

  try {
    console.log('\nTesting dynamicPromptService.js...');
    const dynamicPromptModule = await import(paths.dynamicPromptService);
    console.log('✅ Successfully imported dynamicPromptService');
    console.log('Exports:', Object.keys(dynamicPromptModule));
  } catch (error) {
    console.error('❌ Error importing dynamicPromptService:', error.message);
  }

  try {
    console.log('\nTesting fallbackChallenges.js...');
    const fallbackChallengesModule = await import(paths.fallbackChallenges);
    console.log('✅ Successfully imported fallbackChallenges');
    console.log('Exports:', Object.keys(fallbackChallengesModule));
  } catch (error) {
    console.error('❌ Error importing fallbackChallenges:', error.message);
  }

  console.log('\nImport tests completed');
}

testImports().catch(error => {
  console.error('Test failed:', error);
}); 