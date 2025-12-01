# Manual Lambda Timeout Update Guide

The automated script can't update Lambda timeouts during the Amplify build because the build role doesn't have Lambda permissions. Here's how to update them manually:

## Step 1: Find Your Lambda Functions

### Option A: Run the Script Locally (Easiest)

On your local machine with AWS credentials configured:

```bash
# Make sure you have AWS credentials set up
aws configure

# Run the helper script
node scripts/list-lambda-functions.js
```

This will show you all Lambda functions across multiple regions. Look for functions with:
- "amplify" in the name
- Your app ID `d21qzkz6ya2vb7` in the name
- Recent "Last modified" dates

### Option B: AWS Lambda Console

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. **Check the region selector** (top-right) - try `us-east-1` first
3. Look for functions with:
   - Names containing "amplify"
   - Names containing your app ID: `d21qzkz6ya2vb7`
   - Recent modification dates (today's date)
4. If you don't see them in `us-east-1`, try:
   - `us-west-2`
   - `eu-west-1`
   - Check your Amplify app settings for the deployment region

### Option C: CloudWatch Logs

1. Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)
2. Look for Log Groups starting with:
   - `/aws/amplify/`
   - `/aws/lambda/amplify-`
3. Check recent log entries - they often show the function name

## Step 2: Update Each Function's Timeout

For each Lambda function you find:

1. **Click on the function name** in the Lambda Console
2. Go to **Configuration** tab
3. Click **General configuration** → **Edit**
4. Set **Timeout** to **900 seconds** (15 minutes - the maximum)
5. Click **Save**

**Important**: Update ALL functions that handle your API routes:
- Functions for `/api/scrape` (scraping - needs 15 minutes)
- Functions for `/api/ask` (AI requests - needs 15 minutes)
- Functions for `/api/credits` (can be shorter, but 15 min is safe)
- Any other API route functions

## Step 3: Verify the Update

After updating, you can verify by:
1. Checking the function's Configuration tab - timeout should show 900 seconds
2. Making a test API call to see if it no longer times out

## Alternative: Update via AWS CLI

If you found the function names, you can update them via CLI:

```bash
# Replace FUNCTION_NAME with the actual function name
# Replace REGION with the region (e.g., us-east-1)
aws lambda update-function-configuration \
  --function-name FUNCTION_NAME \
  --timeout 900 \
  --region REGION
```

## Why This Happens

Amplify's build role (`AmplifySSRLoggingRole`) doesn't have Lambda permissions for security reasons. This is normal AWS security practice - build roles typically have minimal permissions.

## After Each Deployment

**Important**: Amplify may reset Lambda timeouts when you redeploy. You'll need to update them again after each deployment, OR:

1. Use the local script after each deployment:
   ```bash
   node scripts/update-lambda-timeout.js
   ```

2. Or manually update in the AWS Console again

## Need Help Finding Functions?

If you still can't find the functions:
1. Make a test API call to your deployed app (e.g., try scraping)
2. Check CloudWatch Logs immediately after - the log group will show the function name
3. The function might be created on first invocation

