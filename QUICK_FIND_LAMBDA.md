# Quick Guide: Finding Your Amplify Lambda Functions

Based on your Lambda console screenshot, the functions shown are from a different project. Here's how to find your Instagram Intelligence app's Lambda functions:

## Method 1: Check Different Regions

Your Amplify app might be deployed in a different region. Try:

1. **Change the region selector** in the Lambda console (top-right)
2. Check these common regions:
   - `us-east-1` (N. Virginia) ← Most common for Amplify
   - `us-west-2` (Oregon)
   - `eu-west-1` (Ireland)
   - `ap-southeast-1` (Singapore)

3. Look for functions with:
   - Names containing `d21qzkz6ya2vb7` (your Amplify App ID)
   - Names containing "amplify"
   - Very recent "Last modified" dates (today)

## Method 2: Trigger Function Creation

Amplify Lambda functions are often created **on first API call**. Try this:

1. **Open your deployed app** in a browser
2. **Make a test API call**:
   - Try scraping an Instagram URL
   - Or call `/api/credits` endpoint
3. **Immediately check CloudWatch Logs**:
   - Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)
   - Look for new Log Groups created just now
   - The log group name will contain the Lambda function name

## Method 3: Run the Helper Script Locally

On your local machine:

```bash
# Make sure AWS credentials are configured
aws configure

# Run the script to search all regions
node scripts/list-lambda-functions.js
```

This will:
- Search multiple regions automatically
- Show functions with "amplify" in the name
- Show functions with your app ID
- Display their current timeout settings

## Method 4: Check Amplify Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app (`d21qzkz6ya2vb7`)
3. Go to **App settings** → **General**
4. Check the **Region** where your app is deployed
5. Then check that region in Lambda Console

## Method 5: CloudWatch Logs (Most Reliable)

1. Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)
2. Look for Log Groups with patterns like:
   - `/aws/amplify/d21qzkz6ya2vb7/...`
   - `/aws/lambda/amplify-d21qzkz6ya2vb7-...`
   - `/aws/lambda/nextjs-...`
3. Click on a recent log group
4. The function name is in the log group path

## What to Look For

Your Amplify functions will likely have names like:
- `amplify-d21qzkz6ya2vb7-main-<hash>-api-scrape-<random>`
- `amplify-d21qzkz6ya2vb7-main-<hash>-api-ask-<random>`
- `amplify-d21qzkz6ya2vb7-main-<hash>-ssr-<random>`
- Or just long auto-generated names with "amplify" in them

## If You Still Can't Find Them

The functions might be using **Lambda@Edge** (via CloudFront):

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Find distributions associated with your Amplify app
3. Check the **Behaviors** tab
4. Lambda@Edge functions are listed there

## Quick Test

Try this right now:
1. Open your deployed app URL
2. Make a request to: `https://your-app-url.amplifyapp.com/api/credits`
3. Immediately go to CloudWatch Logs
4. You should see a new log group appear - that's your function!

