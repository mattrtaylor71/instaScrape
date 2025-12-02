import { NextRequest, NextResponse } from 'next/server';
import { updateJob, getJob } from '@/lib/jobQueue';

/**
 * Webhook endpoint for Lambda to POST results when scraping completes
 * This allows async Lambda invocation to update job status
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK RECEIVED ===');
    const body = await request.json();
    console.log('Webhook body keys:', Object.keys(body));
    console.log('JobId:', body.jobId);
    console.log('Has result:', !!body.result);
    console.log('Has error:', !!body.error);
    
    const { jobId, result, error } = body;

    if (!jobId) {
      console.error('Webhook missing jobId');
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if job exists before updating
    const existingJob = getJob(jobId);
    console.log('Existing job:', existingJob ? `Found (status: ${existingJob.status})` : 'NOT FOUND');

    if (error) {
      console.log('Updating job with error:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error.message || error,
      });
      return NextResponse.json({ success: true, status: 'failed' });
    }

    if (result) {
      console.log('Updating job with result. Result type:', result.type);
      console.log('Result size:', JSON.stringify(result).length, 'bytes');
      updateJob(jobId, {
        status: 'completed',
        result,
      });
      
      // Verify update worked
      const updatedJob = getJob(jobId);
      console.log('Job updated. New status:', updatedJob?.status);
      console.log('Job has result:', !!updatedJob?.result);
      
      return NextResponse.json({ 
        success: true, 
        status: 'completed',
        jobId,
        resultType: result.type,
      });
    }

    console.error('Webhook missing both result and error');
    return NextResponse.json(
      { error: 'Either result or error must be provided' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

