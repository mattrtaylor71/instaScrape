#!/usr/bin/env node

/**
 * Helper script to find Lambda function name from a RequestId
 * Usage: node scripts/find-function-from-request-id.js <REQUEST_ID>
 */

const { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const REQUEST_ID = process.argv[2];

if (!REQUEST_ID) {
  console.error('❌ Please provide a RequestId as an argument');
  console.error('Usage: node scripts/find-function-from-request-id.js <REQUEST_ID>');
  console.error('\nExample:');
  console.error('  node scripts/find-function-from-request-id.js 0a125841-839f-4144-a4ca-f06b537b1803');
  process.exit(1);
}

const REGIONS_TO_CHECK = [
  process.env.AWS_REGION || 'us-east-1',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-southeast-1',
];

async function findFunctionFromRequestId() {
  console.log(`🔍 Searching for Lambda function with RequestId: ${REQUEST_ID}\n`);

  for (const region of REGIONS_TO_CHECK) {
    try {
      const logsClient = new CloudWatchLogsClient({ region });
      
      // Search in common log group patterns
      const logGroupPatterns = [
        '/aws/lambda/amplify-*',
        '/aws/amplify/*',
        '/aws/lambda/*',
      ];

      console.log(`Checking region: ${region}...`);

      // List log groups first
      const { LogGroups } = await logsClient.send(
        new DescribeLogGroupsCommand({
          logGroupNamePrefix: '/aws/lambda/',
        })
      );

      if (!LogGroups || LogGroups.length === 0) {
        console.log(`  ⚪ No log groups found in ${region}\n`);
        continue;
      }

      console.log(`  Found ${LogGroups.length} log group(s) in ${region}`);

      // Search each log group for the RequestId
      for (const logGroup of LogGroups.slice(0, 20)) { // Limit to first 20 to avoid too many API calls
        try {
          const filterCommand = new FilterLogEventsCommand({
            logGroupName: logGroup.logGroupName,
            filterPattern: REQUEST_ID,
            limit: 1,
          });

          const result = await logsClient.send(filterCommand);
          
          if (result.events && result.events.length > 0) {
            console.log(`\n✅ FOUND!`);
            console.log(`   Log Group: ${logGroup.logGroupName}`);
            console.log(`   Region: ${region}`);
            
            // Extract function name from log group name
            // Format: /aws/lambda/function-name
            const functionName = logGroup.logGroupName.replace('/aws/lambda/', '');
            console.log(`   Function Name: ${functionName}`);
            console.log(`\n💡 To update this function's timeout, run:`);
            console.log(`   aws lambda update-function-configuration \\`);
            console.log(`     --function-name ${functionName} \\`);
            console.log(`     --timeout 900 \\`);
            console.log(`     --region ${region}`);
            return;
          }
        } catch (error) {
          // Skip log groups that don't have the RequestId
          continue;
        }
      }
    } catch (error) {
      console.log(`  ❌ Error in ${region}: ${error.message}`);
    }
  }

  console.log('\n⚠️  Could not find the function with that RequestId.');
  console.log('\n💡 Alternative methods:');
  console.log('   1. Check CloudWatch Logs manually: https://console.aws.amazon.com/cloudwatch/');
  console.log('   2. Search for the RequestId in the log groups');
  console.log('   3. Run: node scripts/list-lambda-functions.js to see all functions');
}

findFunctionFromRequestId().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

