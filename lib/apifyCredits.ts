import { getApifyClient } from './apifyClient';

/**
 * Get Apify account balance and convert to credits.
 * Credits = balance (in dollars) * 100, without dollar sign.
 */
export async function getApifyCredits(): Promise<number> {
  try {
    const client = getApifyClient();
    
    // Get user info which includes account balance
    const user = await client.user().get();
    
    // Log the full user object to see what fields are available
    console.log('Apify user object keys:', Object.keys(user));
    console.log('Apify user object:', JSON.stringify(user, null, 2));
    
    // Apify API returns creditBalance in cents (or dollars, need to check)
    // According to Apify docs: https://docs.apify.com/platform/integrations/api
    // The user object has a creditBalance field
    const userAny = user as any;
    
    // Try creditBalance first (this is the standard Apify field)
    let balance: number = 0;
    
    // Check creditBalance (this is in USD, not cents)
    if (userAny.creditBalance !== undefined && userAny.creditBalance !== null) {
      balance = typeof userAny.creditBalance === 'string'
        ? parseFloat(userAny.creditBalance.replace(/[^0-9.]/g, '')) || 0
        : userAny.creditBalance || 0;
      console.log(`Found creditBalance:`, balance);
    }
    
    // If creditBalance is not available, try other fields
    if (balance <= 0) {
      const possibleFields = [
        'usdBalance',
        'balance',
        'accountBalance',
        'usdAccountBalance',
        'billingBalance',
        'usdBillingBalance',
      ];
      
      for (const field of possibleFields) {
        if (userAny[field] !== undefined && userAny[field] !== null) {
          const value = userAny[field];
          if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed) && parsed > 0) {
              balance = parsed;
              console.log(`Found balance in field '${field}':`, balance);
              break;
            }
          } else if (typeof value === 'number' && value > 0) {
            balance = value;
            console.log(`Found balance in field '${field}':`, balance);
            break;
          }
        }
      }
    }
    
    // Convert to credits: multiply by 100 and round to integer
    // (e.g., $10.50 becomes 1050 credits)
    const credits = Math.floor(balance * 100);
    
    console.log('Final calculated credits:', credits, 'from balance:', balance);
    
    return credits;
  } catch (error: any) {
    console.error('Error fetching Apify credits:', error);
    console.error('Error details:', error.message, error.stack);
    // Return 0 if we can't fetch
    return 0;
  }
}
