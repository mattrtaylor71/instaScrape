#!/usr/bin/env node

/**
 * Helper script to list all Lambda functions to help find Amplify/Next.js functions
 */

const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function listAllFunctions() {
  console.log('🔍 Listing all Lambda functions...\n');

  try {
    const listCommand = new ListFunctionsCommand({});
    const response = await lambda.send(listCommand);
    
    console.log(`Total functions: ${response.Functions.length}\n`);
    
    // Group by potential type
    const amplifyFunctions = [];
    const nextjsFunctions = [];
    const apiFunctions = [];
    const otherFunctions = [];
    
    response.Functions.forEach(fn => {
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
      console.log('📦 Amplify Functions:');
      amplifyFunctions.forEach(fn => {
        console.log(`   - ${fn.FunctionName}`);
        console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB | Runtime: ${fn.Runtime}`);
      });
      console.log('');
    }
    
    if (nextjsFunctions.length > 0) {
      console.log('⚛️  Next.js Functions:');
      nextjsFunctions.forEach(fn => {
        console.log(`   - ${fn.FunctionName}`);
        console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB | Runtime: ${fn.Runtime}`);
      });
      console.log('');
    }
    
    if (apiFunctions.length > 0) {
      console.log('🔌 API Functions:');
      apiFunctions.slice(0, 10).forEach(fn => {
        console.log(`   - ${fn.FunctionName}`);
        console.log(`     Timeout: ${fn.Timeout}s | Memory: ${fn.MemorySize}MB`);
      });
      if (apiFunctions.length > 10) {
        console.log(`   ... and ${apiFunctions.length - 10} more`);
      }
      console.log('');
    }
    
    console.log('📋 All Functions (first 30):');
    response.Functions.slice(0, 30).forEach((fn, idx) => {
      console.log(`   ${idx + 1}. ${fn.FunctionName} (${fn.Timeout}s, ${fn.MemorySize}MB)`);
    });
    if (response.Functions.length > 30) {
      console.log(`   ... and ${response.Functions.length - 30} more`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllFunctions();

