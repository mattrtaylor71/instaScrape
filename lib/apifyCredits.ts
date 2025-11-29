import { getApifyClient } from './apifyClient';

/**
 * Get Apify account remaining credits.
 * Credits = (maxMonthlyUsageUsd - currentUsageUsd) * 100, without dollar sign.
 * This represents remaining credits available for the current billing cycle.
 */
export async function getApifyCredits(): Promise<number> {
  try {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
      throw new Error('APIFY_TOKEN is not set');
    }
    
    // Make direct HTTP request to Apify API
    // Endpoint: GET https://api.apify.com/v2/users/me/limits
    const response = await fetch('https://api.apify.com/v2/users/me/limits', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
    }
    
    const limits = await response.json();
    
    console.log('Apify limits object:', JSON.stringify(limits, null, 2));
    
    // Extract the usage information
    const currentUsageUsd = limits.currentUsageUsd || 0;
    const maxMonthlyUsageUsd = limits.maxMonthlyUsageUsd || 0;
    
    // Calculate remaining credits: max - current = remaining
    const remainingUsd = maxMonthlyUsageUsd - currentUsageUsd;
    
    console.log('Current usage (USD):', currentUsageUsd);
    console.log('Max monthly usage (USD):', maxMonthlyUsageUsd);
    console.log('Remaining (USD):', remainingUsd);
    
    // Convert to credits: multiply by 100 and round to integer
    // (e.g., $10.50 remaining becomes 1050 credits)
    const credits = Math.floor(remainingUsd * 100);
    
    console.log('Final calculated credits:', credits);
    
    return credits;
  } catch (error: any) {
    console.error('Error fetching Apify credits:', error);
    console.error('Error details:', error.message, error.stack);
    // Return 0 if we can't fetch
    return 0;
  }
}
