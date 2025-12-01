import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = jobQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job status
    return NextResponse.json({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      result: job.result,
      error: job.error,
      progress: job.progress,
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

