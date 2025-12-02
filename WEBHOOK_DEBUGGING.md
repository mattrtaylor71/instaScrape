# Webhook Debugging Guide

## The Problem

When testing in Lambda console, scraping completes in ~50 seconds and returns results. But when called via Amplify, it takes 5+ minutes and doesn't return anything.

## Root Cause

The **in-memory job queue doesn't work in a serverless environment** because:

1. `/api/scrape` creates job → Lambda instance A's memory
2. `/api/scrape/status/:jobId` polls → Might hit Lambda instance B → Job not found ❌
3. Webhook updates job → Might hit Lambda instance C → Job not found ❌

Each API request can hit a **different Lambda instance**, and in-memory state is **not shared** between instances.

## How to Debug

### Step 1: Check CloudWatch Logs

1. Go to **AWS CloudWatch** → **Log groups**
2. Find logs for your Lambda function: `/aws/lambda/instagram-scrape-lambda`
3. Look for these log entries:

```
=== WEBHOOK CALL START ===
JobId: job-...
Webhook URL: https://...
=== WEBHOOK SUCCESS ===
```

Or:

```
=== WEBHOOK FAILED ===
Error message: ...
```

### Step 2: Check Amplify Logs

1. Go to **AWS Amplify Console** → Your App → **Monitoring** → **Logs**
2. Or **CloudWatch** → **Log groups** → `/aws/amplify/...`
3. Look for:

```
=== WEBHOOK RECEIVED ===
JobId: ...
Job found: YES/NO
```

And:

```
=== STATUS CHECK ===
JobId: ...
Job found: YES/NO
```

### Step 3: Identify the Issue

**If webhook logs show "WEBHOOK SUCCESS" but status checks show "Job not found":**
- ✅ Webhook is working
- ❌ Job queue is in different Lambda instance
- **Solution**: Use persistent storage (S3 or DynamoDB)

**If webhook logs show "WEBHOOK FAILED":**
- ❌ Webhook call is failing
- Check error message in logs
- Common issues:
  - Network timeout
  - CORS error
  - Invalid URL
  - Request too large

**If no webhook logs at all:**
- ❌ Lambda isn't calling webhook
- Check if `jobId` is being passed correctly
- Check Lambda environment variables

## Quick Fix: Use S3 for Job Storage

Instead of in-memory storage, we can use S3 to store job results:

1. **Create S3 bucket** (or use existing)
2. **Store job results** in S3: `s3://bucket/jobs/{jobId}.json`
3. **Read from S3** when polling status
4. **Delete from S3** after retrieving

This works across all Lambda instances because S3 is shared storage.

## Long-term Solution: DynamoDB

For production, use DynamoDB:

1. **Create DynamoDB table**: `scrape-jobs`
2. **Store jobs** with `jobId` as partition key
3. **TTL** for automatic cleanup
4. **Read/Write** from all Lambda instances

## Next Steps

1. **Check CloudWatch logs** to see what's happening
2. **Share the logs** so we can identify the exact issue
3. **Implement S3 storage** if it's a serverless instance issue
4. **Or implement DynamoDB** for production-ready solution

