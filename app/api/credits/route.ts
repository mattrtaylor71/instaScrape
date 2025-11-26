import { NextRequest, NextResponse } from 'next/server';
import { getApifyCredits } from '@/lib/apifyCredits';

export async function GET(request: NextRequest) {
  try {
    const credits = await getApifyCredits();
    return NextResponse.json({ credits });
  } catch (error: any) {
    console.error('Error getting credits:', error);
    return NextResponse.json(
      { 
        credits: 0,
        error: error.message || 'Failed to fetch credits' 
      },
      { status: 500 }
    );
  }
}

