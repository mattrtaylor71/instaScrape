# How to Find Your Lambda Functions

AWS Amplify creates Lambda functions automatically for Next.js API routes, but they can be hard to find. This guide will help you locate them.

## Why Are They Hard to Find?

1. **Obscure Names**: Amplify generates function names that don't clearly indicate they're for your app
2. **Multiple Regions**: Functions might be in different AWS regions
3. **Auto-Managed**: Amplify creates and manages these functions automatically
4. **Different Architectures**: Next.js API routes might use Lambda@Edge (via CloudFront) instead of regular Lambda

## Method 1: Use the Helper Script (Recommended)

We've created a script that searches across multiple AWS regions:

```bash
# Make sure AWS credentials are configured
aws configure

# Run the helper script
node scripts/list-lambda-functions.js
```

This will:
- Check multiple AWS regions (us-east-1, us-west-2, eu-west-1, etc.)
- List all Lambda functions
- Group them by type (Amplify, Next.js, API functions)
- Show their current timeout settings

**Look for functions with:**
- "amplify" in the name
- Your Amplify App ID (`d21qzkz6ya2vb7`) in the name
- "nextjs", "next-js", or "ssr" in the name
- "api" or "route" in the name

## Method 2: AWS Lambda Console

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. **Important**: Check the region selector in the top-right corner
3. Try these regions:
   - `us-east-1` (N. Virginia) - most common
   - `us-west-2` (Oregon)
   - `eu-west-1` (Ireland)
   - The region where your Amplify app is deployed

4. In the Functions list, look for:
   - Functions with "amplify" in the name
   - Functions with long, auto-generated names
   - Functions with recent "Last modified" dates

5. **Filter by tags**: Some Amplify functions have tags like:
   - `amplify:app-id: d21qzkz6ya2vb7`
   - `amplify:branch: main`

## Method 3: CloudWatch Logs

1. Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)
2. Look for Log Groups with names like:
   - `/aws/amplify/...`
   - `/aws/lambda/amplify-...`
   - `/aws/lambda/nextjs-...`

3. Check recent log entries - they often contain the function name

## Method 4: Amplify Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app
3. Go to **App settings** → **Environment variables**
4. Check the **Region** where your app is deployed
5. Go to **Hosting** → Check the deployment details

## Method 5: AWS CLI

```bash
# List all functions in a specific region
aws lambda list-functions --region us-east-1

# Search for functions with "amplify" in the name
aws lambda list-functions --region us-east-1 | grep -i amplify

# Get function details (replace FUNCTION_NAME)
aws lambda get-function --function-name FUNCTION_NAME --region us-east-1
```

## Common Function Name Patterns

Amplify functions often follow these patterns:
- `amplify-<app-id>-<branch>-<hash>-api-<route>`
- `amplify-<app-id>-<branch>-<hash>-ssr`
- `nextjs-<hash>-api-<route>`
- `amplify-<app-id>-<branch>-<hash>-<random>`

## If You Still Can't Find Them

### Check Lambda@Edge

Next.js API routes on Amplify might use Lambda@Edge (via CloudFront):
1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Find distributions associated with your Amplify app
3. Check the **Behaviors** tab
4. Lambda@Edge functions are listed there

### Check if Functions Exist

If you just deployed, functions might not exist yet:
- Functions are created on first API route invocation
- Try making a request to your API endpoint
- Then check again

### Permissions

Make sure your AWS credentials have permission to:
- `lambda:ListFunctions`
- `lambda:GetFunction`
- `lambda:UpdateFunctionConfiguration`

## After Finding Functions

Once you've identified your functions:

1. **Note their names and regions**
2. **Run the update script:**
   ```bash
   node scripts/update-lambda-timeout.js
   ```

3. **Or manually update in AWS Console:**
   - Go to Lambda Console
   - Click on the function
   - Go to **Configuration** → **General configuration** → **Edit**
   - Set **Timeout** to **900 seconds** (15 minutes - maximum)
   - Click **Save**

## Troubleshooting

### "No functions found"

- Check if your Amplify app has been deployed
- Verify AWS credentials are configured correctly
- Try different AWS regions
- Check if you have Lambda read permissions

### "Permission denied"

- Your AWS credentials need `lambda:ListFunctions` permission
- Check IAM policies for your AWS user/role

### "Functions keep resetting"

- Amplify may reset timeouts on redeployment
- The `update-lambda-timeout.js` script runs automatically after each build
- You can also manually update after each deployment

## Need More Help?

1. Check the Amplify build logs for function names
2. Look at CloudWatch Logs for your API routes
3. Contact AWS Support if functions are completely missing

