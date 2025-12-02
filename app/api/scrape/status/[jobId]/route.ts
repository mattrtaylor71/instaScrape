import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    console.log(`=== STATUS CHECK ===`);
    console.log(`JobId: ${jobId}`);
    console.log(`Request URL: ${request.url}`);
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);
    console.log(`Job found: ${job ? 'YES' : 'NO'}`);
    if (job) {
      console.log(`Job status: ${job.status}`);
      console.log(`Job has result: ${!!job.result}`);
      console.log(`Job has error: ${!!job.error}`);
    } else {
      console.log('⚠️ Job not found in memory. This might be a serverless instance issue.');
      console.log('Each API request can hit a different Lambda instance, so in-memory state is not shared.');
    }

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
