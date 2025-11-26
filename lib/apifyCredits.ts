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
    
    // Apify user object may have different balance fields
    // Common fields: usdBalance, balance, accountBalance, or monthlyUsageLimit
    let balance: number = 0;
    
    // Try to get balance from various possible fields
    const userAny = user as any;
    const balanceValue = userAny.usdBalance ?? 
                        userAny.balance ?? 
                        userAny.accountBalance ??
                        userAny.monthlyUsageLimit ??
                        userAny.usdMonthlyUsageLimit ??
                        0;
    
    // Convert to number if it's a string (e.g., "$10.50" -> 10.50)
    if (typeof balanceValue === 'string') {
      balance = parseFloat(balanceValue.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof balanceValue === 'number') {
      balance = balanceValue;
    }
    
    // If balance is 0 or negative, try to get from usage limits or other fields
    if (balance <= 0) {
      // Some accounts might show remaining usage limit
      const remaining = userAny.remainingUsageLimit ?? userAny.usdRemainingUsageLimit ?? 0;
      if (remaining > 0) {
        balance = typeof remaining === 'string' 
          ? parseFloat(remaining.replace(/[^0-9.]/g, '')) || 0
          : remaining;
      }
    }
    
    // Convert to credits: multiply by 100 and round to integer
    const credits = Math.floor(balance * 100);
    
    console.log('Apify user data:', JSON.stringify(user, null, 2));
    console.log('Calculated credits:', credits, 'from balance:', balance);
    
    return credits;
  } catch (error: any) {
    console.error('Error fetching Apify credits:', error);
    // Return 0 if we can't fetch
    return 0;
  }
}

