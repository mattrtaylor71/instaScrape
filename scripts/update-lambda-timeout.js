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

// Common AWS regions to check
const REGIONS_TO_CHECK = [
  process.env.AWS_REGION || 'us-east-1',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-southeast-1',
];

async function updateLambdaTimeouts() {
  console.log('🔧 Updating Lambda function timeouts for AWS Amplify...');
  console.log(`App ID: ${AMPLIFY_APP_ID}`);
  console.log(`Branch: ${BRANCH}\n`);

  const allFunctions = [];

  // Check each region
  for (const region of REGIONS_TO_CHECK) {
    try {
      const lambda = new LambdaClient({ region });
      const listCommand = new ListFunctionsCommand({});
      const response = await lambda.send(listCommand);
      
      if (response.Functions && response.Functions.length > 0) {
        allFunctions.push(...response.Functions.map(fn => ({ ...fn, region })));
        console.log(`✅ ${region}: Found ${response.Functions.length} function(s)`);
      }
    } catch (error) {
      console.log(`⚠️  ${region}: ${error.message}`);
    }
  }

  if (allFunctions.length === 0) {
    console.log('\n⚠️  No Lambda functions found in any checked region.');
    console.log('\n💡 Try running: node scripts/list-lambda-functions.js');
    console.log('   This will help you find functions across all regions.');
    return;
  }

  try {
    
    console.log(`\n📊 Total Lambda functions found: ${allFunctions.length}`);
    console.log('\n🔍 Searching for Amplify/Next.js functions...\n');
    
    // Filter functions for this Amplify app - be very flexible with matching
    // Next.js API routes on Amplify can have various naming patterns
    const functions = allFunctions.filter(fn => {
      const name = fn.FunctionName.toLowerCase();
      // Match any function that could be a Next.js API route
      return name.includes('amplify') ||
             (name.includes('nextjs') || name.includes('next-js')) ||
             (name.includes('ssr') && (name.includes('api') || name.includes('route'))) ||
             (name.includes('api') && (name.includes('scrape') || name.includes('ask') || name.includes('credits'))) ||
             name.includes(AMPLIFY_APP_ID.toLowerCase());
    });
    
    // If we found too many, try to narrow down by app ID
    let filteredFunctions = functions;
    if (functions.length > 20) {
      filteredFunctions = functions.filter(fn => 
        fn.FunctionName.toLowerCase().includes(AMPLIFY_APP_ID.toLowerCase())
      );
    }

    if (filteredFunctions.length === 0) {
      console.log('\n⚠️  No Lambda functions found matching Amplify/Next.js patterns');
      console.log(`\n💡 Tips to find your functions:`);
      console.log(`   1. Run: node scripts/list-lambda-functions.js`);
      console.log(`   2. Check AWS Lambda Console → Functions (check all regions)`);
      console.log(`   3. Look for functions with "amplify" or "nextjs" in the name`);
      console.log(`   4. Check CloudWatch Logs for your API routes to see function names`);
      console.log(`   5. Next.js API routes might be in Lambda@Edge (check CloudFront)`);
      console.log(`\n🔍 Searching for functions containing "${AMPLIFY_APP_ID}"...`);
      const appIdFunctions = allFunctions.filter(fn => 
        fn.FunctionName.toLowerCase().includes(AMPLIFY_APP_ID.toLowerCase())
      );
      if (appIdFunctions.length > 0) {
        console.log(`   Found ${appIdFunctions.length} function(s) with app ID:`);
        appIdFunctions.forEach(fn => {
          console.log(`      - ${fn.FunctionName} [${fn.region}] (timeout: ${fn.Timeout}s)`);
        });
      } else {
        console.log(`   No functions found with app ID "${AMPLIFY_APP_ID}"`);
      }
      return;
    }

    console.log(`\n✅ Found ${filteredFunctions.length} Lambda function(s) matching Amplify/Next.js patterns:\n`);

    // Update each function
    for (const func of filteredFunctions) {
      const functionName = func.FunctionName;
      const region = func.region;
      const currentTimeout = func.Timeout || 'unknown';
      console.log(`\n📋 Function: ${functionName} [${region}]`);
      console.log(`   Current timeout: ${currentTimeout} seconds`);

      // Determine timeout based on function name
      // For Next.js API routes, we want to set high timeouts for all of them
      let timeout = 900; // Default to 15 minutes (maximum) for all API routes
      
      const nameLower = functionName.toLowerCase();
      if (nameLower.includes('scrape') || nameLower.includes('/api/scrape')) {
        timeout = 900; // 15 minutes for scraping
        console.log('   ⚙️  Target timeout: 900 seconds (15 minutes) - scraping function');
      } else if (nameLower.includes('ask') || nameLower.includes('/api/ask')) {
        timeout = 300; // 5 minutes for AI requests
        console.log('   ⚙️  Target timeout: 300 seconds (5 minutes) - AI function');
      } else if (nameLower.includes('api') || nameLower.includes('route') || nameLower.includes('ssr')) {
        // Any API route gets 15 minutes to be safe
        timeout = 900;
        console.log('   ⚙️  Target timeout: 900 seconds (15 minutes) - API route');
      } else {
        timeout = 900; // Default to max for any Amplify function
        console.log('   ⚙️  Target timeout: 900 seconds (15 minutes) - default');
      }

      // Only update if timeout needs to change
      if (currentTimeout === timeout) {
        console.log(`   ✅ Timeout already set to ${timeout} seconds, skipping update`);
        continue;
      }

      try {
        console.log(`   🔄 Updating timeout from ${currentTimeout}s to ${timeout}s...`);
        const lambdaClient = new LambdaClient({ region });
        const updateCommand = new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Timeout: timeout,
        });
        await lambdaClient.send(updateCommand);
        console.log(`   ✅ Successfully updated timeout to ${timeout} seconds`);
      } catch (error) {
        console.error(`   ❌ Failed to update: ${error.message}`);
      }
    }

    console.log('\n✨ Lambda timeout update complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Total functions found: ${allFunctions.length}`);
    console.log(`   - Functions matching patterns: ${functions.length}`);
    console.log(`   - Functions updated: ${filteredFunctions.length}`);
    console.log('\n⚠️  Note: Amplify may reset these settings on the next deployment.');
    console.log('   This script runs automatically after each build to maintain timeouts.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateLambdaTimeouts();

