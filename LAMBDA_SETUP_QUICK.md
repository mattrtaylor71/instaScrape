# Quick Lambda Setup Guide

## Current Status
✅ Credits are working (2710 credits)  
❌ Lambda function not deployed yet

## Step 1: Deploy the Lambda Function

You have two options:

### Option A: Manual Deployment (Easiest - 5 minutes)

1. **Go to AWS Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click "Create function"**
3. **Choose "Author from scratch"**
4. **Configure**:
   - Function name: `instagram-scrape-lambda`
   - Runtime: `Node.js 18.x`
   - Architecture: `x86_64`
   - Click **"Create function"**

5. **Upload code**:
   - In the Lambda console, scroll to "Code source"
   - Click "Upload from" → ".zip file"
   - First, create the zip file locally:
     ```bash
     cd lambda
     npm install
     zip -r function.zip . -x "*.git*" -x "node_modules/.cache/*"
     ```
   - Upload `function.zip`
   - Click "Save"

6. **Configure timeout**:
   - Go to "Configuration" tab
   - Click "General configuration" → "Edit"
   - Timeout: `15 min 0 sec` (900 seconds) ← **IMPORTANT**
   - Memory: `1024 MB`
   - Click "Save"

7. **Set environment variable**:
   - Still in "Configuration" tab
   - Click "Environment variables" → "Edit"
   - Add: `APIFY_TOKEN` = `YOUR_APIFY_TOKEN` (same token from Amplify)
   - Click "Save"

### Option B: Serverless Framework (If you have it installed)

```bash
cd lambda
npm install
export APIFY_TOKEN=your_token_here
serverless deploy
```

Note the function name from the output (usually `instagram-scrape-lambda-dev-scrape`)

## Step 2: Set Environment Variables in Amplify

1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Select your app**
3. **Go to**: App settings → Environment variables
4. **Add these two variables**:
   - `SCRAPE_LAMBDA_FUNCTION_NAME` = `instagram-scrape-lambda` (or the name from Serverless)
   - `LAMBDA_REGION` = `us-east-1` (or your Lambda's region)

5. **Redeploy** your Amplify app (or wait for auto-deploy)

## Step 3: Set IAM Permissions (Required)

The Amplify app needs permission to invoke the Lambda:

1. **Go to AWS IAM Console**: https://console.aws.amazon.com/iam/
2. **Find your Amplify execution role**:
   - Look for a role like `AmplifySSRLoggingRole-...` or `amplify-...-role`
   - Or check: Amplify Console → App settings → General → Service role
3. **Add inline policy**:
   - Click "Add permissions" → "Create inline policy"
   - JSON tab, paste:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "lambda:InvokeFunction",
           "Resource": "arn:aws:lambda:us-east-1:*:function:instagram-scrape-lambda"
         }
       ]
     }
     ```
   - Replace `us-east-1` with your region if different
   - Replace `*` with your AWS account ID if you want to be more specific
   - Name: `InvokeScrapeLambda`
   - Click "Create policy"

## Step 4: Test

1. **Test the Lambda directly** (optional):
   - In Lambda Console → Test tab
   - Create test event:
     ```json
     {
       "body": "{\"url\":\"https://www.instagram.com/instagram/\"}"
     }
     ```
   - Click "Test"

2. **Test from your app**:
   - Go to your deployed app
   - Try scraping an Instagram URL
   - Should now work!

## Troubleshooting

### "Lambda function not found"
- Check the function name in Amplify env vars matches exactly
- Check the region matches

### "AWS credentials not available"
- Make sure IAM permissions are set (Step 3)
- Wait a few minutes after adding permissions

### "Request timed out"
- Make sure Lambda timeout is set to 15 minutes (900 seconds)
- Check Lambda function logs in CloudWatch

