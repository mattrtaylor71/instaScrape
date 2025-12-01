# 🚨 Quick Fix: Lambda Timeout Issue

Your scrape is timing out after **28 seconds** because the Lambda function timeout wasn't increased. Here's the fastest way to fix it:

## Method 1: Find Function from RequestId (Fastest)

From your log, the RequestId is: `0a125841-839f-4144-a4ca-f06b537b1803`

Run this locally (with AWS credentials configured):

```bash
node scripts/find-function-from-request-id.js 0a125841-839f-4144-a4ca-f06b537b1803
```

This will tell you the exact function name and region. Then update it:

```bash
aws lambda update-function-configuration \
  --function-name <FUNCTION_NAME_FROM_SCRIPT> \
  --timeout 900 \
  --region <REGION_FROM_SCRIPT>
```

## Method 2: AWS Console (Visual)

1. **Go to CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/
2. **Search for the RequestId**: `0a125841-839f-4144-a4ca-f06b537b1803`
3. **Find the Log Group** - it will look like `/aws/lambda/amplify-...-api-scrape-...`
4. **Extract the function name** from the log group name (remove `/aws/lambda/` prefix)
5. **Go to Lambda Console**: https://console.aws.amazon.com/lambda/
6. **Select the correct region** (check the log group's region)
7. **Find and click the function**
8. **Configuration** → **General configuration** → **Edit**
9. **Set Timeout to 900 seconds** (15 minutes - the maximum)
10. **Save**

## Method 3: List All Functions

If the above doesn't work, list all functions:

```bash
node scripts/list-lambda-functions.js
```

Look for functions with:
- "amplify" in the name
- Your app ID `d21qzkz6ya2vb7` in the name
- Recent modification dates
- Timeout of 28-30 seconds (needs updating)

Then update each one:

```bash
aws lambda update-function-configuration \
  --function-name <FUNCTION_NAME> \
  --timeout 900 \
  --region <REGION>
```

## Why This Happened

The automated script in `amplify.yml` tried to update the timeout, but the Amplify build role doesn't have Lambda permissions. This is normal AWS security practice.

## After Each Deployment

**Important**: Amplify may reset Lambda timeouts when you redeploy. You'll need to update them again, OR run the update script locally after each deployment:

```bash
node scripts/update-lambda-timeout.js
```

## Verify It Worked

After updating, try scraping again. It should no longer timeout at 28 seconds.

