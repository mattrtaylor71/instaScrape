import { NextRequest, NextResponse } from 'next/server';
import { getApifyCredits } from '@/lib/apifyCredits';

export async function GET(request: NextRequest) {
  console.log('=== /api/credits route called ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    console.log('Calling getApifyCredits()...');
    const credits = await getApifyCredits();
    console.log('getApifyCredits returned:', credits);
    
    const response = {
      credits,
      success: true,
      timestamp: new Date().toISOString(),
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

