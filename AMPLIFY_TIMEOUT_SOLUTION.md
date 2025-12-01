# 🚨 Amplify Timeout Solution: Async Processing

## The Problem

AWS Amplify Hosting for Next.js manages API routes internally - **they don't show up as regular Lambda functions** in the AWS Lambda console. The timeout is platform-controlled (~30 seconds) and **cannot be easily changed**.

## The Solution: Async Processing Pattern

Instead of waiting for the entire scrape to complete, we'll:

1. **Start the scrape** → Return immediately with a `jobId`
2. **Process in background** → Store results in memory (or database)
3. **Poll for results** → Frontend checks status every few seconds
4. **Return results** → When complete, return the data

This way, the API route returns in <1 second, avoiding the timeout.

## Implementation Options

### Option 1: In-Memory Job Queue (Quick Fix)
- Store jobs in a Map in memory
- Process sequentially or with limited concurrency
- **Limitation**: Jobs lost on server restart

### Option 2: AWS SQS + Lambda (Production)
- Queue scraping jobs
- Separate Lambda function with 15-minute timeout
- Store results in DynamoDB or S3
- **Best for production**

### Option 3: Optimize Current Approach
- Reduce posts/comments fetched
- Make comment fetching optional
- Stream results as they come in

## Recommended: Quick Async Implementation

I'll implement Option 1 (in-memory) which will work immediately without AWS infrastructure changes.

