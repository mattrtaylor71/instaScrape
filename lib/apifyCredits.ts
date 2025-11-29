import { getApifyClient } from './apifyClient';

/**
 * Get Apify account remaining credits.
 * Credits = (maxMonthlyUsageUsd - currentUsageUsd) * 100, without dollar sign.
 * This represents remaining credits available for the current billing cycle.
 */
export async function getApifyCredits(): Promise<number> {
  console.log('=== STARTING getApifyCredits ===');
  
  try {
    // Step 1: Check if token exists
    const token = process.env.APIFY_TOKEN;
    console.log('Step 1: Checking APIFY_TOKEN...');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    if (!token) {
      console.error('ERROR: APIFY_TOKEN is not set in environment variables');
      throw new Error('APIFY_TOKEN is not set');
    }
    
    // Step 2: Make API request
    console.log('Step 2: Making HTTP request to Apify API...');
    const apiUrl = 'https://api.apify.com/v2/users/me/limits';
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Step 3: Received response from API');
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERROR: API request failed');
      console.error('Response body:', errorText);
      throw new Error(`Apify API error: ${response.status} ${response.statusText}. Body: ${errorText}`);
    }
    
    // Step 4: Parse response
    console.log('Step 4: Parsing JSON response...');
    const limits = await response.json();
    console.log('Raw limits object:', JSON.stringify(limits, null, 2));
    console.log('Limits object keys:', Object.keys(limits));
    
    // Step 5: Extract values
    console.log('Step 5: Extracting usage information...');
    const currentUsageUsd = limits.currentUsageUsd;
    const maxMonthlyUsageUsd = limits.maxMonthlyUsageUsd;
    
    console.log('currentUsageUsd:', currentUsageUsd, '(type:', typeof currentUsageUsd, ')');
    console.log('maxMonthlyUsageUsd:', maxMonthlyUsageUsd, '(type:', typeof maxMonthlyUsageUsd, ')');
    
    // Handle null/undefined values
    const currentUsage = currentUsageUsd !== null && currentUsageUsd !== undefined ? currentUsageUsd : 0;
    const maxUsage = maxMonthlyUsageUsd !== null && maxMonthlyUsageUsd !== undefined ? maxMonthlyUsageUsd : 0;
    
    console.log('Parsed currentUsage:', currentUsage);
    console.log('Parsed maxUsage:', maxUsage);
    
    // Step 6: Calculate remaining
    console.log('Step 6: Calculating remaining credits...');
    const remainingUsd = maxUsage - currentUsage;
    console.log('Remaining (USD):', remainingUsd);
    
    // Step 7: Convert to credits
    console.log('Step 7: Converting to credits (multiply by 100)...');
    const credits = Math.floor(remainingUsd * 100);
    console.log('Final calculated credits:', credits);
    
    console.log('=== SUCCESS: getApifyCredits completed ===');
    return credits;
  } catch (error: any) {
    console.error('=== ERROR in getApifyCredits ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    
    // Return 0 if we can't fetch
    console.error('Returning 0 credits due to error');
    return 0;
  }
}
