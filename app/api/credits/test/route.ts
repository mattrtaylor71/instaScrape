import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to debug credits API
 * This endpoint shows detailed information about the API call
 */
export async function GET(request: NextRequest) {
  console.log('=== /api/credits/test route called ===');
  
  const token = process.env.APIFY_TOKEN;
  const hasToken = !!token;
  
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasToken,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    },
  };
  
  // Try to make the API call
  if (hasToken) {
    try {
      console.log('Attempting API call...');
      const apiUrl = 'https://api.apify.com/v2/users/me/limits';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      debugInfo.apiCall = {
        url: apiUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      };
      
      if (response.ok) {
        try {
          const data = await response.json();
          debugInfo.apiResponse = {
            success: true,
            data: data,
            keys: Object.keys(data),
            currentUsageUsd: data.currentUsageUsd,
            maxMonthlyUsageUsd: data.maxMonthlyUsageUsd,
            calculatedRemaining: (data.maxMonthlyUsageUsd || 0) - (data.currentUsageUsd || 0),
            calculatedCredits: Math.floor(((data.maxMonthlyUsageUsd || 0) - (data.currentUsageUsd || 0)) * 100),
          };
        } catch (parseError: any) {
          debugInfo.apiResponse = {
            success: false,
            parseError: parseError.message,
            rawText: await response.text(),
          };
        }
      } else {
        const errorText = await response.text();
        debugInfo.apiResponse = {
          success: false,
          error: errorText,
        };
      }
    } catch (fetchError: any) {
      debugInfo.apiCall = {
        error: true,
        message: fetchError.message,
        stack: fetchError.stack,
      };
    }
  }
  
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  
  return NextResponse.json(debugInfo, { 
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

