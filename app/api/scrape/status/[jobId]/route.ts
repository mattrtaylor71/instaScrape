import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    console.log(`[Status Check] Looking for job: ${jobId}`);
    console.log(`[Status Check] Total jobs in queue: ${jobQueue.getJobCount?.() || 'unknown'}`);

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = jobQueue.getJob(jobId);

    if (!job) {
      console.log(`[Status Check] Job ${jobId} not found in queue`);
      // Return a more informative error
      return NextResponse.json(
        { 
          error: 'Job not found',
          message: 'The job may have expired or is being processed on a different server instance. This can happen with serverless deployments where each request may hit a different server.',
          jobId 
        },
        { status: 404 }
      );
    }

    console.log(`[Status Check] Found job ${jobId} with status: ${job.status}`);

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

