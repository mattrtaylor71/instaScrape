import { ApifyClient } from 'apify-client';

/**
 * Singleton Apify client instance.
 * 
 * This tool should only be used to analyze public Instagram data.
 * Users are responsible for complying with Instagram's Terms of Use and applicable laws.
 * Don't scrape private accounts or data you don't have the right to process.
 */
let apifyClientInstance: ApifyClient | null = null;

export function getApifyClient(): ApifyClient {
  if (apifyClientInstance) {
    return apifyClientInstance;
  }

  const token = process.env.APIFY_TOKEN;
  
  // Debug logging (only in development or if explicitly enabled)
  if (!token) {
    console.error('APIFY_TOKEN is not available. Available env vars:', 
      Object.keys(process.env).filter(k => k.includes('APIFY') || k.includes('OPENAI'))
    );
    throw new Error(
      'APIFY_TOKEN environment variable is not set. ' +
      'If you just added it in AWS Amplify, you MUST redeploy the app for it to take effect. ' +
      'Go to AWS Amplify Console → Your App → Hosting → Environment variables → Click "Redeploy this version"'
    );
  }

  apifyClientInstance = new ApifyClient({ token });
  return apifyClientInstance;
}

