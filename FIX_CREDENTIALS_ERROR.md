# Fix "Could not load credentials from any providers" Error

## The Problem

The CloudWatch logs show:
```
CredentialsProviderError: Could not load credentials from any providers
```

This means the AWS SDK can't find credentials to use, even though the IAM policy is set correctly.

## Root Cause

On AWS Amplify, Next.js SSR functions need **both**:
1. ✅ **Service Role** (for Amplify to manage resources) - You've set this
2. ❌ **Compute Role** (for the SSR function to assume credentials) - This might be missing!

## Solution: Set the Compute Role

The Compute Role is what your Next.js API routes use to assume AWS credentials at runtime.

### Step 1: Check Current Compute Role

1. Go to **AWS Amplify Console** → Your App
2. Go to **App settings** → **IAM roles**
3. Check the **"Compute role"** section
4. If it says "No default role set", you need to create one

### Step 2: Create a Compute Role (if needed)

1. **Go to AWS IAM Console**: https://console.aws.amazon.com/iam/
2. **Click "Roles"** → **"Create role"**
3. **Select "AWS service"** → **"Lambda"** (or "Amplify")
4. **Click "Next"**
5. **Add the same policy** you added to the Service Role:
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
6. **Name the role**: `AmplifyComputeRole-InstagramScrape`
7. **Click "Create role"**

### Step 3: Set Compute Role in Amplify

1. Go back to **AWS Amplify Console** → Your App
2. Go to **App settings** → **IAM roles**
3. Click **"Edit"** next to "Compute role"
4. Select your newly created role: `AmplifyComputeRole-InstagramScrape`
5. Click **"Save"**

### Step 4: Redeploy

1. **Redeploy your Amplify app**
2. **Wait for deployment to complete**
3. **Try scraping again**

## Alternative: Use the Same Role for Both

If you want to use the same role for both Service and Compute:

1. In Amplify Console → App settings → IAM roles
2. Set the **Compute role** to the same role as the **Service role**: `AmplifySSRLoggingRole-b6160d89-0a3e-46d4-8065-760f8932aa64`
3. Make sure that role has the `lambda:InvokeFunction` permission
4. Redeploy

## Why This Happens

- **Service Role**: Used by Amplify to manage your app's infrastructure
- **Compute Role**: Used by your Next.js SSR functions (API routes) to assume AWS credentials at runtime

If the Compute Role isn't set, your API routes can't assume any AWS credentials, even if the Service Role has permissions.

## Verify It's Working

After setting the Compute Role and redeploying:

1. Check CloudWatch logs - you should no longer see `CredentialsProviderError`
2. Try scraping - it should work!

## Still Not Working?

If you still get the error after setting the Compute Role:

1. **Wait 2-3 minutes** for IAM changes to propagate
2. **Check the role's trust relationship** - it should trust `amplify.amazonaws.com` or `lambda.amazonaws.com`
3. **Verify the role has the Lambda invoke permission**
4. **Check CloudWatch logs** for more detailed error messages

