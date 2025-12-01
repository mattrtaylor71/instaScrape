# AWS Deployment Guide

This guide covers deploying the Instagram Intelligence app to AWS using two methods:

## Option 1: AWS Amplify (Recommended - Easiest)

AWS Amplify is the easiest way to deploy Next.js apps to AWS. It handles everything automatically.

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- GitHub account (or GitLab/Bitbucket)

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Install AWS Amplify CLI** (if not already installed)
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

3. **Deploy via AWS Console** (Easiest method):
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select your branch (main/master)
   - Build settings will auto-detect Next.js
   - Add environment variables:
     - `APIFY_TOKEN`: Your Apify API token
     - `OPENAI_API_KEY`: Your OpenAI API key
   - Click "Save and deploy"

4. **Or deploy via CLI**:
   ```bash
   amplify init
   amplify add hosting
   amplify publish
   ```

### Access Your App
After deployment, AWS Amplify will provide you with a URL like:
`https://main.xxxxxxxxx.amplifyapp.com`

---

## Option 2: AWS Lambda + API Gateway (Serverless)

This uses Serverless Framework to deploy to Lambda functions.

### Prerequisites
- AWS Account with credentials configured
- Node.js 18+
- Serverless Framework installed

### Steps

1. **Install Serverless Framework**
   ```bash
   npm install -g serverless
   npm install --save-dev serverless-nextjs-plugin
   ```

2. **Configure AWS Credentials**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter your default region (e.g., us-east-1)
   ```

3. **Set Environment Variables**
   Create a `.env.production` file (don't commit this):
   ```env
   APIFY_TOKEN=your_apify_token_here
   OPENAI_API_KEY=your_openai_key_here
   ```

4. **Deploy**
   ```bash
   # Install dependencies
   npm install
   
   # Deploy to AWS
   serverless deploy
   ```

5. **After Deployment**
   Serverless will output a URL like:
   `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`

### Update Environment Variables
If you need to update environment variables after deployment:
```bash
serverless deploy function -f api --update-env APIFY_TOKEN=your_token,OPENAI_API_KEY=your_key
```

### Remove Deployment
```bash
serverless remove
```

---

## Option 3: Docker + AWS ECS/Fargate (Alternative)

For more control, you can containerize the app.

### Steps

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build
   
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and push to ECR**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name instagram-intelligence
   
   # Build and tag
   docker build -t instagram-intelligence .
   docker tag instagram-intelligence:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/instagram-intelligence:latest
   
   # Push
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/instagram-intelligence:latest
   ```

3. **Deploy to ECS/Fargate**
   - Use AWS Console or Terraform/CloudFormation
   - Set environment variables in task definition

---

## Environment Variables

Regardless of deployment method, you need these environment variables:

- `APIFY_TOKEN`: Your Apify API token from https://console.apify.com/account/integrations
- `OPENAI_API_KEY`: Your OpenAI API key from https://platform.openai.com/api-keys

### Setting in AWS Amplify
1. Go to App settings → Environment variables
2. Add each variable
3. Redeploy

### Setting in Lambda (Serverless)
Add to `serverless.yml` or use AWS Systems Manager Parameter Store:
```yaml
provider:
  environment:
    APIFY_TOKEN: ${ssm:/instagram-intelligence/apify-token}
    OPENAI_API_KEY: ${ssm:/instagram-intelligence/openai-key}
```

---

## Cost Estimates

### AWS Amplify
- Free tier: 15 build minutes/month, 5GB storage, 15GB served/month
- After free tier: ~$0.01 per build minute, $0.15/GB storage, $0.15/GB served
- **Estimated cost**: $0-5/month for low traffic

### Lambda (Serverless)
- Free tier: 1M requests/month, 400,000 GB-seconds
- After free tier: $0.20 per 1M requests, $0.0000166667 per GB-second
- **Estimated cost**: $0-10/month for low-medium traffic

### ECS/Fargate
- Fargate: ~$0.04/vCPU-hour, ~$0.004/GB-hour
- **Estimated cost**: $15-30/month for always-on service

---

## Troubleshooting

### Build Failures
- Check Node.js version (should be 18+)
- Ensure all dependencies are in `package.json`
- Check build logs in AWS Console

### Environment Variables Not Working
- Verify variables are set in deployment platform
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Timeout Issues (Lambda)

#### For Next.js SSR on AWS Amplify Hosting
- **Problem**: Next.js SSR routes on Amplify Hosting have platform-controlled timeouts (~30 seconds) that cannot be easily increased.
- **Workarounds**:
  1. **Reduce scraping scope**: The app defaults to 10 posts instead of 20
  2. **Create separate Lambda function**: Move heavy scraping to a standalone Lambda (not SSR route) with configurable timeout
  3. **Implement async pattern**: Return job ID immediately, process in background, poll for results

#### For Serverless Framework deployments
- Increase timeout in `serverless.yml`:
  ```yaml
  provider:
    timeout: 60  # seconds (up to 900 for Lambda)
  ```

#### For Amplify Gen 2 functions
- Set timeout in `amplify/functions/<name>/resource.ts`:
  ```ts
  export const myFunction = defineFunction({
    timeoutSeconds: 60, // 1-900 seconds
  });
  ```

#### For Amplify Gen 1 functions
- Run `amplify update function` and set timeout when prompted
- Or set `_BUILD_TIMEOUT` environment variable for build timeouts (5-120 minutes)

### CORS Issues
- Already configured in `serverless.yml`
- For Amplify, CORS is handled automatically

---

## Recommended: AWS Amplify

For this Next.js app, **AWS Amplify is the recommended choice** because:
- ✅ Zero configuration needed
- ✅ Automatic HTTPS/SSL
- ✅ CDN included
- ✅ Easy environment variable management
- ✅ Automatic deployments on git push
- ✅ Free tier is generous
- ✅ Built specifically for Next.js

The app will be accessible via a URL like:
`https://main.xxxxxxxxx.amplifyapp.com`

