# Async Polling Setup - Complete Guide

## What Was Implemented

I've implemented **async processing with polling** to allow scraping to run for the full 5-15 minutes without hitting Amplify's 30-second API route timeout.

## How It Works

1. **Frontend** calls `/api/scrape` → Gets `jobId` immediately
2. **API Route** invokes Lambda **asynchronously** (Event type) → Returns immediately
3. **Lambda** processes scraping in background (can take 5-15 minutes)
4. **Lambda** posts results to `/api/scrape/webhook` when complete
5. **Frontend** polls `/api/scrape/status/:jobId` every 5 seconds
6. **Status endpoint** returns results when job completes

## What You Need to Do

### 1. Update Lambda Function

1. **Go to AWS Lambda Console** → `instagram-scrape-lambda`
2. **Code source** → **Upload from** → **.zip file**
3. **Upload** `lambda/function.zip` (I just created it with axios)
4. **Click Save**

### 2. Set Webhook URL in Lambda (Optional)

1. **Lambda Console** → **Configuration** → **Environment variables**
2. **Add**: `WEBHOOK_URL` = `https://main.d21qzkz6ya2vb7.amplifyapp.com/api/scrape/webhook`
3. **Or leave it** - it defaults to the correct URL

### 3. Increase Lambda Timeout to 15 Minutes

1. **Lambda Console** → **Configuration** → **General configuration** → **Edit**
2. **Timeout**: `15 min 0 sec` (900 seconds - maximum)
3. **Save**

### 4. Redeploy Amplify App

The code changes are already pushed. Just trigger a redeploy:
- **Amplify Console** → Your App → **Redeploy this version**
- Or push a commit to trigger auto-deploy

## How It Works Now

### User Flow:
1. User enters Instagram URL → Clicks "Start Scraping"
2. **Immediate response**: "Scraping in progress..." (no timeout!)
3. Frontend polls every 5 seconds
4. Shows progress: "Scraping... (25s)", "Scraping... (50s)", etc.
5. When complete: Results appear automatically

### Technical Flow:
```
Frontend → POST /api/scrape
  ↓
API Route → Creates job → Invokes Lambda (async Event)
  ↓ (returns immediately)
Lambda → Processes scraping (5-15 minutes)
  ↓
Lambda → POST /api/scrape/webhook (with results)
  ↓
Webhook → Updates job status
  ↓
Frontend polling → GET /api/scrape/status/:jobId
  ↓
Status endpoint → Returns results
  ↓
Frontend → Displays results
```

## Benefits

✅ **No more timeouts** - API route returns in <1 second  
✅ **Full scraping** - Can run for 15 minutes  
✅ **Better UX** - Progress updates, no hanging  
✅ **Resilient** - Handles errors gracefully  

## Files Changed

- ✅ `app/api/scrape/route.ts` - Async Lambda invocation
- ✅ `app/api/scrape/status/[jobId]/route.ts` - Status polling endpoint
- ✅ `app/api/scrape/webhook/route.ts` - Webhook for Lambda results
- ✅ `lib/jobQueue.ts` - In-memory job storage
- ✅ `app/page.tsx` - Polling logic in frontend
- ✅ `lambda/index.js` - Webhook callback on completion
- ✅ `lambda/package.json` - Added axios dependency

## Testing

1. **Start a scrape** - Should get jobId immediately
2. **Watch the progress** - Should update every 5 seconds
3. **Wait for completion** - Should show results when done
4. **Check CloudWatch logs** - Lambda should complete successfully

## Troubleshooting

### Webhook not being called?
- Check Lambda logs in CloudWatch
- Verify webhook URL is correct
- Check if Lambda has internet access (VPC issues)

### Polling not working?
- Check browser console for errors
- Verify `/api/scrape/status/:jobId` endpoint works
- Check job queue in API route logs

### Job stuck in "processing"?
- Check Lambda logs - it might have failed
- Check webhook endpoint logs
- Job will timeout after 10 minutes of polling

