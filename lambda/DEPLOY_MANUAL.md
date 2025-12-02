# Manual Lambda Deployment Guide

## Quick Steps

### 1. Package the Function

The `deploy.sh` script has already created `function.zip` for you.

### 2. Deploy via AWS Console

1. **Go to AWS Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click "Create function"**
3. **Choose "Author from scratch"**
4. **Configure**:
   - Function name: `instagram-scrape-lambda`
   - Runtime: `Node.js 18.x`
   - Architecture: `x86_64`
   - Click **"Create function"**

5. **Upload code**:
   - Scroll to "Code source"
   - Click "Upload from" → ".zip file"
   - Upload `function.zip` from the `lambda/` directory
   - Click "Save"

6. **Configure timeout**:
   - Go to "Configuration" tab
   - Click "General configuration" → "Edit"
   - Timeout: `15 min 0 sec` (900 seconds)
   - Memory: `1024 MB`
   - Click "Save"

7. **Set environment variable**:
   - Go to "Configuration" tab
   - Click "Environment variables" → "Edit"
   - Add: `APIFY_TOKEN` = `YOUR_APIFY_TOKEN_HERE` (use the same token from your Amplify environment variables)
   - Click "Save"

8. **Test the function**:
   - Go to "Test" tab
   - Create new test event:
     ```json
     {
       "body": "{\"url\":\"https://www.instagram.com/instagram/\"}"
     }
     ```
   - Click "Test"
   - Should return profile data

### 3. Configure Next.js App

In **AWS Amplify Console** → Your App → Environment variables:

Add:
- `SCRAPE_LAMBDA_FUNCTION_NAME` = `instagram-scrape-lambda`
- `LAMBDA_REGION` = `us-east-1` (or your Lambda's region)

### 4. Set IAM Permissions

The Amplify app needs permission to invoke the Lambda:

1. Go to **AWS IAM Console**: https://console.aws.amazon.com/iam/
2. Find your Amplify execution role (usually `AmplifySSRLoggingRole-...`)
3. Add inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "lambda:InvokeFunction",
         "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:instagram-scrape-lambda"
       }
     ]
   }
   ```
   Replace `REGION` and `ACCOUNT` with your values.

## Alternative: Use AWS CLI

If you have AWS credentials configured:

```bash
cd lambda
aws lambda create-function \
  --function-name instagram-scrape-lambda \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler scrape-handler.handler \
  --zip-file fileb://function.zip \
  --timeout 900 \
  --memory-size 1024 \
  --environment Variables={APIFY_TOKEN=your_token_here}
```

## Verify Deployment

Test the function:
```bash
aws lambda invoke \
  --function-name instagram-scrape-lambda \
  --payload '{"body":"{\"url\":\"https://www.instagram.com/instagram/\"}"}' \
  response.json
cat response.json
```

