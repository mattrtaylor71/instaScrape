import { NextRequest, NextResponse } from 'next/server';
import { getApifyCredits, getLastApiResponse } from '@/lib/apifyCredits';

export async function GET(request: NextRequest) {
  console.log('=== /api/credits route called ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    console.log('Calling getApifyCredits()...');
    const startTime = Date.now();
    
    // Call the function and capture any debug info
    // We'll need to modify getApifyCredits to return debug info too
    const credits = await getApifyCredits();
    const endTime = Date.now();
    console.log('getApifyCredits returned:', credits);
    console.log('getApifyCredits took:', `${(endTime - startTime) / 1000}s`);
    
    // Get the last API response for debugging
    const lastResponse = getLastApiResponse();
    
    let debugInfo: any = {
      creditsValue: credits,
      creditsType: typeof credits,
      isZero: credits === 0,
      lastApiResponse: lastResponse,
      apiResponseKeys: lastResponse ? Object.keys(lastResponse) : [],
    };
    
    // Also make a fresh API call to see the raw response
    try {
      const token = process.env.APIFY_TOKEN;
      if (token) {
        const testUrl = `https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(token)}`;
        console.log('Making test API call to:', testUrl.replace(token, 'TOKEN_HIDDEN'));
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Test API response status:', testResponse.status);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          debugInfo.rawApiResponse = testData;
          debugInfo.rawApiResponseKeys = Object.keys(testData);
          console.log('Raw API response:', JSON.stringify(testData, null, 2));
        } else {
          const errorText = await testResponse.text();
          debugInfo.apiError = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            body: errorText,
          };
          console.error('Test API call failed:', debugInfo.apiError);
        }
      } else {
        debugInfo.tokenError = 'Token not available for test call';
      }
    } catch (debugError: any) {
      debugInfo.debugError = debugError.message;
      debugInfo.debugErrorStack = debugError.stack;
      console.error('Error making test API call:', debugError);
    }
    
    const response = {
      credits,
      success: true,
      timestamp: new Date().toISOString(),
      debug: debugInfo,
    };
    
    console.log('Returning response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('=== ERROR in /api/credits route ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const errorResponse = {
      credits: 0,
      success: false,
      error: error.message || 'Failed to fetch credits',
      details: error.toString(),
      timestamp: new Date().toISOString(),
    };
    
    console.error('Returning error response:', JSON.stringify(errorResponse, null, 2));
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

