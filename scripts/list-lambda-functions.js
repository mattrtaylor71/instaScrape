#!/usr/bin/env node

/**
 * Helper script to list all Lambda functions to help find Amplify/Next.js functions
 */

const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');

// Common AWS regions to check
const REGIONS_TO_CHECK = [
  process.env.AWS_REGION || 'us-east-1',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-southeast-1',
];

async function listAllFunctions() {
  console.log('🔍 Listing all Lambda functions across multiple regions...\n');
  console.log('ℹ️  Note: Amplify functions might be in any region where your app is deployed.\n');

  const allFunctions = [];
  const regionResults = {};

  // Check each region
  for (const region of REGIONS_TO_CHECK) {
    try {
      const lambda = new LambdaClient({ region });
      const listCommand = new ListFunctionsCommand({});
      const response = await lambda.send(listCommand);
      
      if (response.Functions && response.Functions.length > 0) {
        regionResults[region] = response.Functions;
        allFunctions.push(...response.Functions.map(fn => ({ ...fn, region })));
        console.log(`✅ ${region}: Found ${response.Functions.length} function(s)`);
      } else {
        console.log(`⚪ ${region}: No functions found`);
      }
    } catch (error) {
      console.log(`❌ ${region}: Error - ${error.message}`);
    }
  }

  if (allFunctions.length === 0) {
    console.log('\n⚠️  No Lambda functions found in any checked region.');
    console.log('\n💡 Possible reasons:');
    console.log('   1. Your Amplify app might not have deployed API routes yet');
    console.log('   2. Functions might be in a different region');
    console.log('   3. AWS credentials might not have Lambda read permissions');
    console.log('   4. Next.js API routes might be handled as Lambda@Edge (check CloudFront)');
    return;
  }

  console.log(`\n📊 Total functions found: ${allFunctions.length}\n`);

  // Group by potential type
  const amplifyFunctions = [];
  const nextjsFunctions = [];
  const apiFunctions = [];
  const otherFunctions = [];
  
  allFunctions.forEach(fn => {
    const name = fn.FunctionName.toLowerCase();
    if (name.includes('amplify')) {
      amplifyFunctions.push(fn);
    } else if (name.includes('nextjs') || name.includes('next-js') || name.includes('next')) {
      nextjsFunctions.push(fn);
    } else if (name.includes('api') || name.includes('route')) {
      apiFunctions.push(fn);
    } else {
      otherFunctions.push(fn);
    }
  });
  
  if (amplifyFunctions.length > 0) {
    console.log('📦 Amplify Functions (most likely candidates):');
    amplifyFunctions.forEach(fn => {
      console.log(`   - ${fn.FunctionName} [${fn.region}]`);
      console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB | Runtime: ${fn.Runtime}`);
    });
    console.log('');
  }
  
  if (nextjsFunctions.length > 0) {
    console.log('⚛️  Next.js Functions:');
    nextjsFunctions.forEach(fn => {
      console.log(`   - ${fn.FunctionName} [${fn.region}]`);
      console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB | Runtime: ${fn.Runtime}`);
    });
    console.log('');
  }
  
  if (apiFunctions.length > 0) {
    console.log('🔌 API Functions (first 20):');
    apiFunctions.slice(0, 20).forEach(fn => {
      console.log(`   - ${fn.FunctionName} [${fn.region}]`);
      console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB`);
    });
    if (apiFunctions.length > 20) {
      console.log(`   ... and ${apiFunctions.length - 20} more`);
    }
    console.log('');
  }
  
  console.log('📋 All Functions by Region:');
  Object.entries(regionResults).forEach(([region, functions]) => {
    console.log(`\n   ${region} (${functions.length} functions):`);
    functions.slice(0, 10).forEach((fn, idx) => {
      console.log(`      ${idx + 1}. ${fn.FunctionName} (${fn.Timeout}s, ${fn.MemorySize}MB)`);
    });
    if (functions.length > 10) {
      console.log(`      ... and ${functions.length - 10} more`);
    }
  });

  console.log('\n✨ Done listing Lambda functions.');
  console.log('\n💡 Next steps:');
  console.log('   1. Look for functions with "amplify" in the name (most likely candidates)');
  console.log('   2. Check the region where your Amplify app is deployed');
  console.log('   3. If you found functions, run: node scripts/update-lambda-timeout.js');
  console.log('   4. Or manually update timeouts in AWS Lambda Console');
}

// Run the function
listAllFunctions().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

listAllFunctions();

