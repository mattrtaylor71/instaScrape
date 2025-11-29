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

  // Try multiple possible environment variable names
  const token = process.env.APIFY_TOKEN || 
                process.env.NEXT_PUBLIC_APIFY_TOKEN ||
                process.env.REACT_APP_APIFY_TOKEN;
  
  // Debug logging - show what we found
  if (!token) {
    const allEnvKeys = Object.keys(process.env);
    const relevantKeys = allEnvKeys.filter(k => 
      k.includes('APIFY') || 
      k.includes('OPENAI') ||
      k.includes('AMPLIFY')
    );
    
    console.error('APIFY_TOKEN is not available.');
    console.error('Searched for: APIFY_TOKEN, NEXT_PUBLIC_APIFY_TOKEN, REACT_APP_APIFY_TOKEN');
    console.error('Relevant env vars found:', relevantKeys);
    console.error('Total env vars:', allEnvKeys.length);
    
    // Log a sample of env vars (non-sensitive)
    const sampleVars = allEnvKeys
      .filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('token'))
      .slice(0, 10)
      .reduce((acc, key) => {
        acc[key] = process.env[key]?.substring(0, 20) || '';
        return acc;
      }, {} as Record<string, string>);
    console.error('Sample env vars (non-sensitive):', sampleVars);
    
    throw new Error(
      'APIFY_TOKEN environment variable is not set. ' +
      'Checked: APIFY_TOKEN, NEXT_PUBLIC_APIFY_TOKEN, REACT_APP_APIFY_TOKEN. ' +
      'If you just added it in AWS Amplify, you MUST redeploy the app for it to take effect. ' +
      'Go to AWS Amplify Console → Your App → Hosting → Environment variables → Click "Redeploy this version"'
    );
  }

  apifyClientInstance = new ApifyClient({ token });
  return apifyClientInstance;
}

