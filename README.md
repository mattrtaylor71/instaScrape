# Instagram Intelligence

A modern full-stack web application for analyzing Instagram profiles and posts using Apify scrapers and OpenAI's GPT models.

## Features

- **Profile Scraping**: Extract profile information and recent posts from Instagram profiles
- **Post Analysis**: Scrape comments and metadata from individual Instagram posts
- **AI-Powered Q&A**: Ask natural language questions about scraped data using OpenAI
- **Clean UI**: Modern, responsive interface built with Next.js and Tailwind CSS

## Prerequisites

- Node.js 18+ installed
- An Apify account with API token
- An OpenAI account with API key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then edit `.env.local` and add your credentials:
   ```env
   APIFY_TOKEN=your_apify_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   - **Apify Token**: Get it from [Apify Console](https://console.apify.com/account/integrations)
   - **OpenAI API Key**: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Scrape Instagram Data:**
   - Paste an Instagram URL (profile or post) into the input field
   - Choose a scrape mode:
     - **Auto detect**: Automatically determines if the URL is a profile or post
     - **Profile**: Force profile scraping
     - **Post**: Force post scraping
   - Click "Scrape" and wait for the data to load

2. **Ask Questions:**
   - After scraping, use the "Ask AI" section to ask questions about the data
   - Examples:
     - "Summarize the user's most recent posts about beverages."
     - "What are the main themes in the comments?"
     - "What topics does this profile post about most?"

## Apify Actors

The application uses the following Apify Actors (configured in `lib/instagramScraper.ts`):

1. **Profile Scraper**: `apify/instagram-profile-scraper`
   - Used for scraping profile information and recent posts
   - Actor ID can be changed in `lib/instagramScraper.ts` (line ~50)

2. **Comment Scraper**: `apify/instagram-comment-scraper`
   - Used for scraping comments from posts
   - Actor ID can be changed in `lib/instagramScraper.ts` (line ~100)

### Changing Apify Actors

If you need to use different Apify Actors:

1. Open `lib/instagramScraper.ts`
2. Find the `actorId` variable in the relevant function:
   - `scrapeProfileAndPostsByUrl()` - for profile scraping
   - `scrapePostCommentsByUrl()` - for comment scraping
3. Replace the actor ID with your desired Actor ID
4. Adjust the input format and data mapping if the Actor's output structure differs

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── scrape/
│   │   │   └── route.ts          # POST /api/scrape endpoint
│   │   └── ask/
│   │       └── route.ts          # POST /api/ask endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main UI page
│   └── globals.css               # Global styles
├── lib/
│   ├── apifyClient.ts            # Apify client singleton
│   ├── instagramScraper.ts       # Instagram scraping utilities
│   └── ai.ts                     # OpenAI integration
├── types/
│   └── instagram.ts              # TypeScript type definitions
└── package.json
```

## Legal & Ethical Considerations

⚠️ **Important**: This tool should only be used to analyze **public** Instagram data. Users are responsible for:

- Complying with Instagram's Terms of Use
- Following applicable laws and regulations
- Not scraping private accounts or data without proper authorization
- Respecting user privacy and data protection regulations

The application includes comments in the codebase reminding developers of these responsibilities.

## Troubleshooting

### "APIFY_TOKEN is not set" error
- Make sure you've created `.env.local` file
- Verify the token is correctly set (no extra spaces or quotes)
- Restart the development server after adding environment variables

### "OPENAI_API_KEY is not set" error
- Same as above - check `.env.local` file
- Ensure the key is valid and has sufficient credits

### Scraping fails
- Verify your Apify token is valid and has sufficient credits
- Check that the Instagram URL is public and accessible
- Some Apify Actors may require additional configuration or have usage limits

### 504 Gateway Timeout Error
- **Cause**: For Next.js SSR apps on AWS Amplify Hosting, the Lambda timeout is **platform-controlled** and cannot be easily increased (typically limited to ~30 seconds). Instagram scraping can take several minutes.
- **Current Workaround**: The app defaults to scraping only 10 posts (instead of 20) to reduce scraping time.
- **Long-term Solutions**:
  1. **Move scraping to a separate Lambda function** (not an SSR route) where you control the timeout:
     - Create a standalone Lambda function with up to 15-minute timeout
     - Call it from your Next.js app via API Gateway
  2. **Implement async processing**:
     - Return immediately with a job ID
     - Process scraping in background
     - Client polls for results
  3. **Use AWS Step Functions or SQS** for long-running tasks
- **Note**: Manually changing Lambda timeout in AWS Console will be reset by Amplify on next deploy. For Next.js SSR routes, timeouts are managed by the platform.

### AI answers are slow
- The OpenAI model used is `gpt-4o-mini` (cost-effective). You can change it in `lib/ai.ts` to `gpt-4` for potentially better results (but higher cost)

## Development

- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Run linter**: `npm run lint`

## AWS Deployment

This app can be deployed to AWS using multiple methods. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to AWS Amplify (Recommended)

1. Push code to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
3. Connect repository
4. Add environment variables (`APIFY_TOKEN`, `OPENAI_API_KEY`)
5. Deploy!

Your app will be live at: `https://main.xxxxxxxxx.amplifyapp.com`

### Alternative: Deploy to Lambda

```bash
npm install -g serverless
npm install --save-dev serverless-nextjs-plugin
serverless deploy
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details.

## License

This project is provided as-is for educational and research purposes. Ensure compliance with all applicable terms of service and laws when using this software.

