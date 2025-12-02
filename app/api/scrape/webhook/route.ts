import { NextRequest, NextResponse } from 'next/server';
import { updateJob } from '@/lib/jobQueue';

/**
 * Webhook endpoint for Lambda to POST results when scraping completes
 * This allows async Lambda invocation to update job status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, result, error } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    if (error) {
      updateJob(jobId, {
        status: 'failed',
        error: error.message || error,
      });
      return NextResponse.json({ success: true, status: 'failed' });
    }

    if (result) {
      updateJob(jobId, {
        status: 'completed',
        result,
      });
      return NextResponse.json({ success: true, status: 'completed' });
    }

    return NextResponse.json(
      { error: 'Either result or error must be provided' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

