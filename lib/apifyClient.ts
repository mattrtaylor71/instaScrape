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
  if (!token) {
    throw new Error(
      'APIFY_TOKEN environment variable is not set. Please set it in your .env.local file.'
    );
  }

  apifyClientInstance = new ApifyClient({ token });
  return apifyClientInstance;
}

