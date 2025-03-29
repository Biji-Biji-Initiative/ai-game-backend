/**
 * Verify Database Data
 * 
 * This script queries the database tables to verify that the seed data has been loaded.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Direct connection to Supabase
console.log('Creating Supabase client...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 *
 */
async function verifyData() {
  try {
    // Check challenge_types
    console.log('\nFetching challenge_types:');
    const { data: challengeTypes, error: typesError } = await supabase
      .from('challenge_types')
      .select('id, code, name')
      .limit(5);
    
    if (typesError) {
      console.error('Error fetching challenge_types:', typesError);
    } else {
      console.log(`Found ${challengeTypes.length} challenge types:`);
      challengeTypes.forEach(type => {
        console.log(`- ${type.name} (${type.code})`);
      });
    }
    
    // Check format_types
    console.log('\nFetching format_types:');
    const { data: formatTypes, error: formatsError } = await supabase
      .from('format_types')
      .select('id, code, name')
      .limit(5);
    
    if (formatsError) {
      console.error('Error fetching format_types:', formatsError);
    } else {
      console.log(`Found ${formatTypes.length} format types:`);
      formatTypes.forEach(format => {
        console.log(`- ${format.name} (${format.code})`);
      });
    }
    
    // Check challenge_focus_areas
    console.log('\nFetching focus_areas:');
    const { data: focusAreas, error: areasError } = await supabase
      .from('challenge_focus_areas')
      .select('id, code, name')
      .limit(5);
    
    if (areasError) {
      console.error('Error fetching challenge_focus_areas:', areasError);
    } else {
      console.log(`Found ${focusAreas.length} focus areas:`);
      focusAreas.forEach(area => {
        console.log(`- ${area.name} (${area.code})`);
      });
    }
    
    // Check difficulty_levels
    console.log('\nFetching difficulty_levels:');
    const { data: difficultyLevels, error: levelsError } = await supabase
      .from('difficulty_levels')
      .select('id, code, name')
      .limit(5);
    
    if (levelsError) {
      console.error('Error fetching difficulty_levels:', levelsError);
    } else {
      console.log(`Found ${difficultyLevels.length} difficulty levels:`);
      difficultyLevels.forEach(level => {
        console.log(`- ${level.name} (${level.code})`);
      });
    }
    
  } catch (error) {
    console.error('Error verifying data:', error);
  }
}

verifyData(); 