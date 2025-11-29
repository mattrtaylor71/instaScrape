import { NextRequest, NextResponse } from 'next/server';
import { getApifyCredits } from '@/lib/apifyCredits';

export async function GET(request: NextRequest) {
  try {
    const credits = await getApifyCredits();
    return NextResponse.json({ credits, success: true });
  } catch (error: any) {
    console.error('Error getting credits:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        credits: 0,
        success: false,
        error: error.message || 'Failed to fetch credits',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

