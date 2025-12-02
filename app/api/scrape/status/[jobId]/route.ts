import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        result: job.result,
        completedAt: job.completedAt,
      });
    }

    if (job.status === 'failed') {
      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        error: job.error,
        completedAt: job.completedAt,
      }, { status: 500 });
    }

    // Still processing
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      message: 'Scraping in progress...',
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check job status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
