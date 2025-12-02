# Diagnose Environment Variable Issues

## Quick Check

1. **Visit this URL in your browser** (replace with your domain):
   ```
   https://main.d21qzkz6ya2vb7.amplifyapp.com/api/check-env
   ```

2. **Look for these fields**:
   - `lambdaFunctionName.exists` should be `true`
   - `lambdaFunctionName.value` should be `instagram-scrape-lambda`
   - `lambdaRegion.exists` should be `true`
   - `lambdaRegion.value` should be `us-east-1`

## If Variables Are NOT Set

### Step 1: Verify in Amplify Console

1. Go to **AWS Amplify Console** → Your App
2. Go to **App settings** → **Environment variables**
3. Verify these exist:
   - `SCRAPE_LAMBDA_FUNCTION_NAME` = `instagram-scrape-lambda`
   - `LAMBDA_REGION` = `us-east-1`

### Step 2: Redeploy the App

**This is critical!** Environment variables only take effect after redeployment.

1. In Amplify Console → Your App
2. Click **"Redeploy this version"** (or trigger a new deployment)
3. Wait for the build to complete (usually 3-5 minutes)

### Step 3: Check Again

After redeployment:
1. Visit `/api/check-env` again
2. Try scraping again

## If Variables ARE Set But Still Not Working

### Check Build Logs

1. Go to **Amplify Console** → Your App → **Build history**
2. Click on the latest build
3. Look for these lines in the build output:
   ```
   SCRAPE_LAMBDA_FUNCTION_NAME exists: YES
   LAMBDA_REGION exists: YES
   SCRAPE_LAMBDA_FUNCTION_NAME written to .env.production
   LAMBDA_REGION written to .env.production
   ```

### Check CloudWatch Logs

1. Go to **AWS CloudWatch** → **Log groups**
2. Look for logs from your API route: `/aws/amplify/...`
3. Check the logs when you try to scrape - you should see:
   ```
   Lambda configuration check:
     SCRAPE_LAMBDA_FUNCTION_NAME: instagram-scrape-lambda
     LAMBDA_REGION: us-east-1
   ```

## Common Issues

### Issue 1: Variables Set But App Not Redeployed
**Solution**: Redeploy the app after setting environment variables

### Issue 2: Variables Written to .env.production But Not Read
**Solution**: Next.js on Amplify should read from `process.env` directly. If not, check `next.config.js` for any issues.

### Issue 3: Variables Available But Lambda Invocation Fails
**Solution**: Check IAM permissions (see `FIX_IAM_PERMISSIONS.md`)

## Still Not Working?

Check the error response from `/api/scrape` - it now includes a `debug` object showing:
- What environment variables are available
- What the Lambda function name is set to
- What region is configured

This will help identify the exact issue.

