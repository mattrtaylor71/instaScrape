import { getApifyClient } from './apifyClient';

/**
 * Get Apify account remaining credits.
 * Credits = (maxMonthlyUsageUsd - monthlyUsageUsd) * 100, without dollar sign.
 * This represents remaining credits available for the current billing cycle.
 * 
 * Example: $39 max - $2.99 used = $36.01 remaining = 3601 credits
 */
// Store last API response for debugging
let lastApiResponse: any = null;

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
    // Apify API requires token as query parameter, not Authorization header
    const apiUrl = `https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(token)}`;
    console.log('API URL:', apiUrl.replace(token, 'TOKEN_HIDDEN'));
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
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
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    console.log('Response text length:', responseText.length);
    
    let limits;
    try {
      limits = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('ERROR: Failed to parse JSON response');
      console.error('Parse error:', parseError.message);
      console.error('Response text:', responseText);
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }
    
    // Store for debugging
    lastApiResponse = limits;
    
    console.log('Parsed limits object:', JSON.stringify(limits, null, 2));
    console.log('Limits object keys:', Object.keys(limits));
    console.log('Limits object type:', typeof limits);
    
    // Step 5: Extract values - Apify API returns nested structure
    console.log('Step 5: Extracting usage information...');
    console.log('Full limits structure:', JSON.stringify(limits, null, 2));
    
    // Apify API structure: data.limits.maxMonthlyUsageUsd and data.current.monthlyUsageUsd
    const maxMonthlyUsageUsd = limits.data?.limits?.maxMonthlyUsageUsd ?? 
                               limits.limits?.maxMonthlyUsageUsd ??
                               limits.maxMonthlyUsageUsd ??
                               null;
    
    const currentUsageUsd = limits.data?.current?.monthlyUsageUsd ??
                            limits.current?.monthlyUsageUsd ??
                            limits.currentUsageUsd ??
                            limits.monthlyUsageUsd ??
                            null;
    
    console.log('Found maxMonthlyUsageUsd:', maxMonthlyUsageUsd, 'at path:', 
      limits.data?.limits?.maxMonthlyUsageUsd !== undefined ? 'data.limits.maxMonthlyUsageUsd' :
      limits.limits?.maxMonthlyUsageUsd !== undefined ? 'limits.maxMonthlyUsageUsd' :
      limits.maxMonthlyUsageUsd !== undefined ? 'maxMonthlyUsageUsd' : 'NOT FOUND');
    
    console.log('Found currentUsageUsd:', currentUsageUsd, 'at path:',
      limits.data?.current?.monthlyUsageUsd !== undefined ? 'data.current.monthlyUsageUsd' :
      limits.current?.monthlyUsageUsd !== undefined ? 'current.monthlyUsageUsd' :
      limits.currentUsageUsd !== undefined ? 'currentUsageUsd' :
      limits.monthlyUsageUsd !== undefined ? 'monthlyUsageUsd' : 'NOT FOUND');
    
    console.log('Extracted currentUsageUsd:', currentUsageUsd, '(type:', typeof currentUsageUsd, ')');
    console.log('Extracted maxMonthlyUsageUsd:', maxMonthlyUsageUsd, '(type:', typeof maxMonthlyUsageUsd, ')');
    
    // Handle null/undefined values
    const currentUsage = currentUsageUsd !== null && currentUsageUsd !== undefined ? Number(currentUsageUsd) : 0;
    const maxUsage = maxMonthlyUsageUsd !== null && maxMonthlyUsageUsd !== undefined ? Number(maxMonthlyUsageUsd) : 0;
    
    console.log('Parsed currentUsage (number):', currentUsage);
    console.log('Parsed maxUsage (number):', maxUsage);
    console.log('Is currentUsage NaN?', isNaN(currentUsage));
    console.log('Is maxUsage NaN?', isNaN(maxUsage));
    
    // Step 6: Calculate remaining
    console.log('Step 6: Calculating remaining credits...');
    const remainingUsd = maxUsage - currentUsage;
    console.log('Remaining (USD):', remainingUsd);
    console.log('Remaining calculation: maxUsage (', maxUsage, ') - currentUsage (', currentUsage, ') =', remainingUsd);
    
    // Step 7: Convert to credits (multiply by 100)
    console.log('Step 7: Converting to credits (multiply by 100)...');
    const credits = Math.floor(remainingUsd * 100);
    console.log('Final calculated credits:', credits);
    console.log('Credits calculation: remainingUsd (', remainingUsd, ') * 100 =', credits);
    
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
    lastApiResponse = { error: error.message };
    return 0;
  }
}

// Export function to get last API response for debugging
export function getLastApiResponse() {
  return lastApiResponse;
}
