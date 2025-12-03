# S3 Job Queue Setup Guide

## Overview

The job queue now uses **AWS S3** to store job status and results. This solves the serverless instance issue where in-memory state isn't shared between Lambda instances.

## Step 1: Create S3 Bucket

1. **Go to AWS S3 Console**: https://console.aws.amazon.com/s3/
2. **Click "Create bucket"**
3. **Bucket name**: `instagram-scrape-jobs` (or any unique name)
4. **Region**: Same as your Lambda function (e.g., `us-east-1`)
5. **Block Public Access**: ✅ Keep all settings enabled (bucket should be private)
6. **Click "Create bucket"**

## Step 2: Set Environment Variable

### In AWS Amplify:

1. **Go to AWS Amplify Console** → Your App
2. **App settings** → **Environment variables**
3. **Add variable**:
   - **Key**: `JOB_QUEUE_S3_BUCKET`
   - **Value**: `instagram-scrape-jobs` (or your bucket name)
4. **Save**

### In Lambda Function:

1. **Go to AWS Lambda Console** → `instagram-scrape-lambda`
2. **Configuration** → **Environment variables**
3. **Add variable**:
   - **Key**: `JOB_QUEUE_S3_BUCKET`
   - **Value**: `instagram-scrape-jobs` (or your bucket name)
4. **Save**

## Step 3: Set IAM Permissions

The Amplify Compute Role and Lambda execution role need S3 permissions.

### For Amplify Compute Role:

1. **Go to AWS IAM Console**: https://console.aws.amazon.com/iam/
2. **Roles** → Find your Amplify Compute Role (e.g., `AmplifyComputeRole-InstagramScrape`)
3. **Add inline policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::instagram-scrape-jobs/jobs/*"
    }
  ]
}
```

4. **Name**: `S3JobQueueAccess`
5. **Create policy**

### For Lambda Execution Role:

1. **Go to AWS Lambda Console** → `instagram-scrape-lambda`
2. **Configuration** → **Permissions**
3. **Click on the execution role** (opens IAM)
4. **Add inline policy** (same as above)
5. **Name**: `S3JobQueueAccess`
6. **Create policy**

## Step 4: Redeploy

1. **Redeploy Amplify app** (to pick up environment variable)
2. **Update Lambda function** (if you changed Lambda env vars)

## Step 5: Test

1. Try scraping an Instagram profile
2. Check CloudWatch logs for S3 operations:
   - `Created job in S3: job-...`
   - `Updated job in S3: job-... (status: completed)`
3. Check S3 bucket:
   - Go to S3 Console → Your bucket → `jobs/` folder
   - You should see `.json` files for each job

## Optional: Set Up Lifecycle Policy (Auto-cleanup)

To automatically delete old jobs after 24 hours:

1. **S3 Console** → Your bucket → **Management** → **Lifecycle rules**
2. **Create lifecycle rule**:
   - **Name**: `DeleteOldJobs`
   - **Rule scope**: `jobs/`
   - **Actions**: **Delete expired object delete markers or incomplete multipart uploads**
   - **Days after object creation**: `1` (24 hours)
3. **Create rule**

## Troubleshooting

### Error: "Access Denied" or "403 Forbidden"

- ✅ Check IAM permissions (Step 3)
- ✅ Verify bucket name in environment variables
- ✅ Check bucket region matches Lambda region

### Error: "Bucket not found"

- ✅ Verify bucket name is correct
- ✅ Check bucket exists in the same region as Lambda

### Jobs not appearing in S3

- ✅ Check CloudWatch logs for S3 errors
- ✅ Verify environment variable is set correctly
- ✅ Check IAM permissions allow PutObject

### Jobs found but status not updating

- ✅ Check webhook is being called (Lambda logs)
- ✅ Verify webhook endpoint has S3 permissions
- ✅ Check S3 bucket for updated job files

