# Lambda Timeout Configuration for AWS Amplify

## Problem
Next.js API routes on AWS Amplify Hosting have platform-controlled timeouts (~30 seconds) that cause 504 Gateway Timeout errors for long-running operations like Instagram scraping.

## Solution: Manual Lambda Timeout Configuration

Since Amplify Hosting manages Lambda functions automatically, you need to manually configure the timeout after deployment:

### Step 1: Find Your Lambda Functions

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Look for functions with names like:
   - `amplify-<app-id>-<branch>-<hash>-api-scrape-*`
   - `amplify-<app-id>-<branch>-<hash>-api-ask-*`
   - Functions containing "NextJS" or "SSR" in the name

### Step 2: Increase Timeout

For each Lambda function that handles API routes:

1. Click on the function name
2. Go to **Configuration** tab
3. Click **General configuration** → **Edit**
4. Set **Timeout** to **15 minutes** (900 seconds) - the maximum
5. Click **Save**

### Step 3: Prevent Amplify from Resetting

Unfortunately, Amplify may reset these settings on the next deploy. To prevent this:

**Option A: Use AWS CloudFormation Custom Resource** (Advanced)
- Create a custom resource that sets Lambda timeout after Amplify deployment
- This requires AWS CloudFormation knowledge

**Option B: Post-Deployment Script**
- Create a script that runs after each deployment to update Lambda timeouts
- Use AWS CLI or SDK to update function configurations

**Option C: Use Separate Lambda Functions** (Recommended)
- Move scraping logic to standalone Lambda functions
- Configure timeout in function definition
- Call from Next.js API routes via API Gateway

### Step 4: Verify

After updating, test your scraping endpoint. It should now allow up to 15 minutes for completion.

## Alternative: Environment Variable (If Supported)

Some Amplify configurations support setting timeout via environment variable. Try adding to Amplify Console:

- **Name**: `_LAMBDA_TIMEOUT`
- **Value**: `900` (seconds)

Note: This may not work for Next.js SSR routes as they're platform-managed.

## Recommended Long-term Solution

For production, consider:

1. **Async Processing**: Return job ID immediately, process in background
2. **Separate Lambda Functions**: Create dedicated functions with configurable timeouts
3. **Step Functions**: Use AWS Step Functions for orchestration
4. **SQS + Lambda**: Queue jobs and process asynchronously

See `DEPLOYMENT.md` for more details.

