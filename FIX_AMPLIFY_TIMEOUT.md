# Fix Amplify API Route Timeout (28-30 seconds)

## The Problem

Your Lambda function has a 5-minute timeout, but the **Amplify Next.js API route times out after ~28-30 seconds**. This is a hard limit for Amplify's SSR functions.

## Why This Happens

- **Lambda function timeout**: 5 minutes (you set this) ✅
- **Amplify API route timeout**: ~30 seconds (platform-controlled) ❌
- **Synchronous invocation**: The API route waits for Lambda to complete, so it hits the 30-second limit

## Solution 1: Increase Lambda Timeout to Maximum (15 minutes)

Even though the API route times out, increasing the Lambda timeout ensures the scraping can complete:

1. **Go to AWS Lambda Console** → Your function `instagram-scrape-lambda`
2. **Configuration** → **General configuration** → **Edit**
3. **Set Timeout to**: `15 min 0 sec` (900 seconds - the maximum)
4. **Save**

This won't fix the API route timeout, but it ensures the Lambda can run longer if needed.

## Solution 2: Increase Amplify API Route Timeout (If Possible)

Amplify's Next.js SSR routes have a hard limit, but you can try:

1. **Check Amplify Console** → Your App → **App settings** → **Build settings**
2. Look for timeout settings (may not be available)
3. **Alternative**: Check if there's a way to configure this in `amplify.yml`

**Note**: Amplify may not allow increasing this timeout for SSR routes.

## Solution 3: Use Async Invocation (Recommended for Long Scrapes)

Instead of waiting synchronously, invoke the Lambda asynchronously and poll for results:

1. **Invoke Lambda with `InvocationType: 'Event'`** (async)
2. **Return immediately** with a job ID
3. **Store results** in memory/DynamoDB/S3
4. **Frontend polls** `/api/scrape/status/:jobId` for results
5. **Return results** when complete

This way the API route returns in <1 second, avoiding the timeout.

## Solution 4: Reduce Scraping Scope (Quick Fix)

Reduce what's being scraped to finish within 30 seconds:

- Reduce posts from 5 to 2-3
- Skip comment fetching for profile scrapes
- Only fetch comments for the first post

## Current Status

- ✅ Lambda function is being invoked successfully
- ✅ Credentials are working
- ❌ API route times out after ~28 seconds
- ⚠️ Lambda function may still be running (check CloudWatch logs)

## Immediate Action

1. **Increase Lambda timeout to 15 minutes** (see Solution 1)
2. **Check CloudWatch logs** for the Lambda function to see if it completes after the API route times out
3. **Consider implementing async processing** (Solution 3) for a permanent fix

## Check Lambda Logs

Go to **CloudWatch** → **Log groups** → `/aws/lambda/instagram-scrape-lambda` to see if the Lambda completes successfully even though the API route timed out.

