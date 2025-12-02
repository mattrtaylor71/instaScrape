# Lambda Test Events

Use these JSON payloads to test your Lambda function in the AWS Lambda Console.

## How to Use

1. Go to AWS Lambda Console → Your function → **Test** tab
2. Click **"Create new test event"** or **"Edit"** existing event
3. Choose **"JSON"** format
4. Paste one of the test events below
5. Click **"Save"** then **"Test"**

## Test Events

### Test Profile Scrape (Auto-detect)

```json
{
  "body": "{\"url\":\"https://www.instagram.com/instagram/\",\"mode\":\"auto\"}"
}
```

### Test Profile Scrape (Explicit)

```json
{
  "body": "{\"url\":\"https://www.instagram.com/instagram/\",\"mode\":\"profile\"}"
}
```

### Test Post Scrape (Auto-detect)

```json
{
  "body": "{\"url\":\"https://www.instagram.com/p/C1234567890/\",\"mode\":\"auto\"}"
}
```

### Test Post Scrape (Explicit)

```json
{
  "body": "{\"url\":\"https://www.instagram.com/p/C1234567890/\",\"mode\":\"post\"}"
}
```

### Test Reel Scrape

```json
{
  "body": "{\"url\":\"https://www.instagram.com/reel/ABC123/\",\"mode\":\"auto\"}"
}
```

## Quick Copy-Paste (Most Common)

**Profile test:**
```json
{"body":"{\"url\":\"https://www.instagram.com/instagram/\",\"mode\":\"auto\"}"}
```

**Post test:**
```json
{"body":"{\"url\":\"https://www.instagram.com/p/C1234567890/\",\"mode\":\"auto\"}"}
```

## Expected Response

### Success (Profile)
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"type\":\"profile\",\"profile\":{...}}"
}
```

### Success (Post)
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"type\":\"post\",\"post\":{...}}"
}
```

### Error
```json
{
  "statusCode": 400,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"error\":\"...\"}"
}
```

## Notes

- Replace `instagram` with any real Instagram username
- Replace `C1234567890` with a real Instagram post shortcode
- The `body` field must be a **JSON string** (double-escaped)
- `mode` is optional and defaults to `"auto"`

