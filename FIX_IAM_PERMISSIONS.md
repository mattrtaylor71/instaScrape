# Fix "AWS credentials not available" Error

This error means your Amplify execution role doesn't have permission to invoke the Lambda function.

## Quick Fix (5 minutes)

### Step 1: Find Your Amplify Execution Role

1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Select your app** (`d21qzkz6ya2vb7`)
3. **Go to**: App settings → General
4. **Look for "Service role"** - this is your execution role name
   - Usually something like: `AmplifySSRLoggingRole-...` or `amplify-...-role`
   - **Copy this role name**

### Step 2: Add IAM Policy

1. **Go to AWS IAM Console**: https://console.aws.amazon.com/iam/
2. **Click "Roles"** in the left sidebar
3. **Search for your role name** (from Step 1)
4. **Click on the role name**
5. **Click "Add permissions"** → **"Create inline policy"**
6. **Click the "JSON" tab**
7. **Paste this policy** (replace `us-east-1` with your region if different):

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

8. **Click "Next"**
9. **Name the policy**: `InvokeScrapeLambda`
10. **Click "Create policy"**

### Step 3: Verify

1. **Wait 1-2 minutes** for permissions to propagate
2. **Go back to your Amplify app**
3. **Try scraping again** - should work now!

## Alternative: More Specific Policy

If you want to be more specific (replace `YOUR_ACCOUNT_ID` with your AWS account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:instagram-scrape-lambda"
    }
  ]
}
```

To find your AWS account ID:
- Go to AWS Console → Click your username (top right) → Account ID is shown there

## Troubleshooting

### Still getting the error after adding permissions?

1. **Wait 2-3 minutes** - IAM permissions can take a moment to propagate
2. **Check the role name** - Make sure you added the policy to the correct role
3. **Check the resource ARN** - Make sure the function name matches exactly
4. **Verify Lambda function exists**:
   - Go to Lambda Console: https://console.aws.amazon.com/lambda/
   - Check region `us-east-1` (or your region)
   - Look for function `instagram-scrape-lambda`

### Can't find the execution role?

1. **Check Amplify Console** → App settings → General → Service role
2. **If no role is shown**, Amplify might be using the default role
3. **Try searching IAM for**: `AmplifySSRLoggingRole` or `amplify`

## What This Policy Does

This policy allows your Amplify app (via its execution role) to:
- Invoke the `instagram-scrape-lambda` function
- Only in the specified region (`us-east-1`)
- Only the specific function (not all Lambda functions)

This is a minimal, secure policy that follows the principle of least privilege.

