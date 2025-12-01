import { NextRequest, NextResponse } from 'next/server';
import { getApifyCredits } from '@/lib/apifyCredits';

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
    
    // Also try to get the raw API response for debugging
    let debugInfo: any = {
      creditsValue: credits,
      creditsType: typeof credits,
      isZero: credits === 0,
    };
    
    // Make a direct API call to see the raw response
    try {
      const token = process.env.APIFY_TOKEN;
      if (token) {
        const testUrl = `https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(token)}`;
        const testResponse = await fetch(testUrl);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          debugInfo.rawApiResponse = testData;
          debugInfo.apiResponseKeys = Object.keys(testData);
        } else {
          debugInfo.apiError = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            body: await testResponse.text(),
          };
        }
      }
    } catch (debugError: any) {
      debugInfo.debugError = debugError.message;
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

