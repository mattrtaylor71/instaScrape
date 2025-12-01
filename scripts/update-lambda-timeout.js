#!/usr/bin/env node

/**
 * Script to update Lambda function timeouts for AWS Amplify Next.js API routes
 * 
 * Usage:
 *   node scripts/update-lambda-timeout.js
 * 
 * Requires:
 *   - AWS CLI configured with appropriate permissions
 *   - AMPLIFY_APP_ID environment variable set
 *   - @aws-sdk/client-lambda package (install with: npm install @aws-sdk/client-lambda)
 */

const { LambdaClient, ListFunctionsCommand, UpdateFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');

const AMPLIFY_APP_ID = process.env.AMPLIFY_APP_ID;
const BRANCH = process.env.AMPLIFY_BRANCH || 'main';

// App ID is now set to default, but log if using default
if (AMPLIFY_APP_ID === 'd21qzkz6ya2vb7' && !process.env.AMPLIFY_APP_ID) {
  console.log('ℹ️  Using default AMPLIFY_APP_ID. Set AMPLIFY_APP_ID env var to override.');
}

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function updateLambdaTimeouts() {
  console.log('🔧 Updating Lambda function timeouts for AWS Amplify...');
  console.log(`App ID: ${AMPLIFY_APP_ID}`);
  console.log(`Branch: ${BRANCH}\n`);

  try {
    // List all Lambda functions
    const listCommand = new ListFunctionsCommand({});
    const response = await lambda.send(listCommand);
    
    // Filter functions for this Amplify app - be more flexible with matching
    const functions = response.Functions.filter(fn => {
      const name = fn.FunctionName.toLowerCase();
      return (name.includes('amplify') && name.includes(AMPLIFY_APP_ID.toLowerCase())) ||
             (name.includes('nextjs') && name.includes('api')) ||
             (name.includes('ssr') && name.includes('api'));
    });

    if (functions.length === 0) {
      console.log('⚠️  No Lambda functions found for this Amplify app');
      console.log('Make sure AWS credentials are configured correctly');
      return;
    }

    console.log(`Found ${functions.length} Lambda function(s):\n`);

    // Update each function
    for (const func of functions) {
      const functionName = func.FunctionName;
      console.log(`Updating ${functionName}...`);

      // Determine timeout based on function name
      let timeout = 60; // Default 1 minute
      if (functionName.includes('api-scrape') || functionName.includes('scrape')) {
        timeout = 900; // 15 minutes for scraping
        console.log('  Setting timeout to 900 seconds (15 minutes) for scraping function');
      } else if (functionName.includes('api-ask') || functionName.includes('ask')) {
        timeout = 300; // 5 minutes for AI requests
        console.log('  Setting timeout to 300 seconds (5 minutes) for AI function');
      } else {
        console.log('  Setting timeout to 60 seconds (default) for other functions');
      }

      try {
        const updateCommand = new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Timeout: timeout,
        });
        await lambda.send(updateCommand);
        console.log(`  ✅ Successfully updated ${functionName} timeout to ${timeout} seconds\n`);
      } catch (error) {
        console.error(`  ❌ Failed to update ${functionName}:`, error.message);
      }
    }

    console.log('✨ Lambda timeout update complete!');
    console.log('\nNote: Amplify may reset these settings on the next deployment.');
    console.log('Consider running this script after each deployment, or set up a CI/CD step.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateLambdaTimeouts();

