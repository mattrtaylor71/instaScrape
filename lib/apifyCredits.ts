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
    console.log('Apify user object:', JSON.stringify(user, null, 2));
    
    // Apify user object may have different balance fields
    // Try common field names for account balance
    const userAny = user as any;
    
    // Try various possible balance fields
    let balance: number = 0;
    const possibleFields = [
      'usdBalance',
      'balance',
      'accountBalance',
      'usdAccountBalance',
      'billingBalance',
      'usdBillingBalance',
      'monthlyUsageLimit',
      'usdMonthlyUsageLimit',
      'remainingUsageLimit',
      'usdRemainingUsageLimit',
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
    
    // If still 0, check if there's a nested object with balance info
    if (balance <= 0 && userAny.billing) {
      const billing = userAny.billing;
      if (billing.balance !== undefined) {
        balance = typeof billing.balance === 'string'
          ? parseFloat(billing.balance.replace(/[^0-9.]/g, '')) || 0
          : billing.balance || 0;
      }
    }
    
    // Convert to credits: multiply by 100 and round to integer
    const credits = Math.floor(balance * 100);
    
    console.log('Final calculated credits:', credits, 'from balance:', balance);
    
    return credits;
  } catch (error: any) {
    console.error('Error fetching Apify credits:', error);
    // Return 0 if we can't fetch
    return 0;
  }
}
