# Instagram Scrape Lambda Function

This Lambda function handles Instagram scraping with a 15-minute timeout (Lambda maximum).

## Deployment

### Option 1: Using Serverless Framework (Recommended)

1. **Install Serverless Framework**:
   ```bash
   npm install -g serverless
   ```

2. **Install dependencies**:
   ```bash
   cd lambda
   npm install
   ```

3. **Set environment variable**:
   ```bash
   export APIFY_TOKEN=your_apify_token_here
   ```

4. **Deploy**:
   ```bash
   serverless deploy
   ```

5. **Get the function name** from the output and set it in your Next.js app:
   ```bash
   # In AWS Amplify Console, add environment variable:
   SCRAPE_LAMBDA_FUNCTION_NAME=instagram-scrape-lambda-dev-scrape
   LAMBDA_REGION=us-east-1
   ```

### Option 2: Manual AWS Console Deployment

1. **Create a new Lambda function**:
   - Go to AWS Lambda Console
   - Click "Create function"
   - Choose "Author from scratch"
   - Runtime: Node.js 18.x
   - Architecture: x86_64

2. **Upload code**:
   - Copy `scrape-handler.js` content
   - Paste into Lambda function code editor

3. **Set environment variables**:
   - `APIFY_TOKEN`: Your Apify API token

4. **Configure timeout**:
   - General configuration → Edit
   - Timeout: 15 minutes (900 seconds)
   - Memory: 1024 MB

5. **Set function name** in Next.js app:
   - In AWS Amplify Console, add environment variable:
   - `SCRAPE_LAMBDA_FUNCTION_NAME`: Your Lambda function name
   - `LAMBDA_REGION`: Your AWS region (e.g., us-east-1)

6. **Set IAM permissions**:
   - The Next.js app needs permission to invoke this Lambda
   - Add IAM policy to Amplify's execution role:
     ```json
     {
       "Effect": "Allow",
       "Action": "lambda:InvokeFunction",
       "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:FUNCTION_NAME"
     }
     ```

## Testing

Test the Lambda function directly:

```bash
aws lambda invoke \
  --function-name instagram-scrape-lambda-dev-scrape \
  --payload '{"body":"{\"url\":\"https://www.instagram.com/username/\"}"}' \
  response.json
```

## Function Configuration

- **Timeout**: 900 seconds (15 minutes - Lambda maximum)
- **Memory**: 1024 MB
- **Runtime**: Node.js 18.x

## Environment Variables

- `APIFY_TOKEN`: Required - Your Apify API token

## Next.js Integration

The Next.js app will automatically invoke this Lambda function when `/api/scrape` is called. Make sure to set:

- `SCRAPE_LAMBDA_FUNCTION_NAME`: The name of your Lambda function
- `LAMBDA_REGION`: The AWS region where the Lambda is deployed

