# Lambda Timeout Configuration for AWS Amplify

## Problem
Next.js API routes on AWS Amplify Hosting have platform-controlled timeouts (~30 seconds) that cause 504 Gateway Timeout errors for long-running operations like Instagram scraping.

## Solution: Automated Lambda Timeout Configuration

Since Amplify Hosting manages Lambda functions automatically, you need to configure the timeout after each deployment. We've provided automated scripts to make this easier:

### Automated Solution (Recommended)

We've created scripts to automatically update Lambda timeouts after deployment:

#### Option 1: Bash Script (Linux/Mac)

```bash
# Set your Amplify App ID (find it in AWS Amplify Console)
export AMPLIFY_APP_ID=your-app-id-here
export AMPLIFY_BRANCH=main  # Optional, defaults to 'main'

# Make script executable
chmod +x scripts/update-lambda-timeout.sh

# Run the script
./scripts/update-lambda-timeout.sh
```

#### Option 2: Node.js Script

```bash
# Install AWS SDK (if not already installed)
npm install @aws-sdk/client-lambda

# Set your Amplify App ID
export AMPLIFY_APP_ID=your-app-id-here
export AMPLIFY_BRANCH=main  # Optional

# Run the script
node scripts/update-lambda-timeout.js
```

#### Option 3: Manual Configuration (AWS Console)

If you prefer to do it manually:

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Look for functions with names like:
   - `amplify-<app-id>-<branch>-<hash>-api-scrape-*`
   - `amplify-<app-id>-<branch>-<hash>-api-ask-*`
   - Functions containing "NextJS" or "SSR" in the name
3. For each function:
   - Click on the function name
   - Go to **Configuration** tab
   - Click **General configuration** → **Edit**
   - Set **Timeout** to **15 minutes** (900 seconds) for scraping, 5 minutes (300 seconds) for AI
   - Click **Save**

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

