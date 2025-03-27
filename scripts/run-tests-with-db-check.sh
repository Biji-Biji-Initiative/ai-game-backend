#!/bin/bash

# Run Tests with Database Check
# This script checks Supabase connectivity before running tests

echo "🔍 Checking environment..."
if [ ! -f .env ]; then
  echo "❌ .env file not found! Please create one with your API keys."
  echo "Example contents:"
  echo "OPENAI_API_KEY=your_openai_api_key"
  echo "SUPABASE_URL=your_supabase_url"
  echo "SUPABASE_KEY=your_supabase_anon_key"
  exit 1
fi

# Check if required env vars are set
if [ -z "$OPENAI_API_KEY" ] && [ -z "$(grep OPENAI_API_KEY .env | cut -d '=' -f2)" ]; then
  echo "❌ OPENAI_API_KEY not found in environment or .env file!"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] && [ -z "$(grep SUPABASE_URL .env | cut -d '=' -f2)" ]; then
  echo "❌ SUPABASE_URL not found in environment or .env file!"
  exit 1
fi

# Check for either SUPABASE_KEY or SUPABASE_ANON_KEY
if [ -z "$SUPABASE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ] && 
   [ -z "$(grep SUPABASE_KEY .env | cut -d '=' -f2)" ] && 
   [ -z "$(grep SUPABASE_ANON_KEY .env | cut -d '=' -f2)" ]; then
  echo "❌ Neither SUPABASE_KEY nor SUPABASE_ANON_KEY found in environment or .env file!"
  exit 1
fi

echo "✅ Environment check passed"
echo ""

# Check Supabase connectivity with a small test script
echo "🔌 Testing Supabase connectivity..."
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkConnection() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found in environment');
      process.exit(1);
    }
    
    console.log('Using Supabase URL: ' + supabaseUrl);
    console.log('Using Supabase Key: ' + supabaseKey.substring(0, 15) + '...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query to check connectivity
    const { data, error } = await supabase
      .from('challenges')
      .select('count(*)', { count: 'exact', head: true });
      
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Successfully connected to Supabase!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking Supabase connection:', err.message);
    process.exit(1);
  }
}

checkConnection();
"

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to Supabase. Please check your credentials."
  exit 1
fi

echo "✅ Supabase connection successful"
echo ""

# Run OpenAI connectivity check
echo "🧠 Testing OpenAI connectivity..."
node -e "
const { OpenAI } = require('openai');
require('dotenv').config();

async function checkOpenAI() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OpenAI API key not found in environment');
      process.exit(1);
    }
    
    const openai = new OpenAI({ apiKey });
    
    // Try a simple completion to check API access
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test API connection' }],
      max_tokens: 5
    });
    
    if (response && response.choices && response.choices.length > 0) {
      console.log('✅ Successfully connected to OpenAI API!');
      process.exit(0);
    } else {
      console.error('❌ Unexpected response from OpenAI API');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error checking OpenAI connection:', err.message);
    process.exit(1);
  }
}

checkOpenAI();
"

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to OpenAI API. Please check your API key."
  exit 1
fi

echo "✅ OpenAI API connection successful"
echo ""

# Run the integration tests
echo "🧪 Running all integration tests..."
npm run test:integration:run-all

# Check exit code
if [ $? -ne 0 ]; then
  echo "❌ Some tests failed. Please check the logs for details."
  echo "   Log files are available in test-results directory."
  exit 1
else
  echo "✅ All tests passed successfully!"
fi 