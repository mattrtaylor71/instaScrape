import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createJob, updateJob } from '@/lib/jobQueueS3';
import type { ScrapeRequest, ScrapeResponse } from '@/types/instagram';

function parseInstagramUrl(url: string): 'profile' | 'post' {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.replace(/^\/|\/$/g, '').split('/');

    if (parts[0] === 'p' || parts[0] === 'reel') {
      return 'post';
    }
    return 'profile';
  } catch {
    return 'profile';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();

    // Validate URL
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate URL format
    let url: string;
    try {
      const urlObj = new URL(body.url);
      if (!urlObj.hostname.includes('instagram.com')) {
        return NextResponse.json(
          { error: 'URL must be an Instagram URL' },
          { status: 400 }
        );
      }
      url = body.url;
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Determine scrape type
    const mode = body.mode || 'auto';
    let scrapeType: 'profile' | 'post';

    if (mode === 'auto') {
      scrapeType = parseInstagramUrl(url);
    } else {
      scrapeType = mode;
    }

    // Invoke Lambda function for scraping (15-minute timeout)
    const lambdaFunctionName = process.env.SCRAPE_LAMBDA_FUNCTION_NAME;
    const lambdaRegion = process.env.LAMBDA_REGION || 'us-east-1';

    // Debug logging
    console.log('Lambda configuration check:');
    console.log('  SCRAPE_LAMBDA_FUNCTION_NAME:', lambdaFunctionName || 'NOT SET');
    console.log('  LAMBDA_REGION:', lambdaRegion);
    console.log('  All env vars with LAMBDA:', Object.keys(process.env).filter(k => k.includes('LAMBDA')));
    console.log('  All env vars with SCRAPE:', Object.keys(process.env).filter(k => k.includes('SCRAPE')));

    if (!lambdaFunctionName) {
      return NextResponse.json(
        {
          error: 'Lambda function not configured',
          message: 'Please set SCRAPE_LAMBDA_FUNCTION_NAME environment variable in AWS Amplify Console.',
          details: 'See lambda/README.md for deployment instructions.',
          debug: {
            lambdaFunctionName: lambdaFunctionName || 'NOT SET',
            lambdaRegion: lambdaRegion,
            availableEnvVars: Object.keys(process.env).filter(k => 
              k.includes('LAMBDA') || k.includes('SCRAPE')
            ),
          },
        },
        { status: 503 }
      );
    }

    try {
      // Create a job for async processing
      const jobId = await createJob();
      await updateJob(jobId, { status: 'processing' });

      // Configure Lambda client
      const lambdaClient = new LambdaClient({
        region: lambdaRegion,
      });
      
      // Invoke Lambda asynchronously (Event type) so it doesn't block
      const invokeCommand = new InvokeCommand({
        FunctionName: lambdaFunctionName,
        InvocationType: 'Event', // Async invocation - doesn't wait for response
        Payload: JSON.stringify({
          body: JSON.stringify({ url, mode }),
          jobId, // Pass job ID so Lambda can update status
        }),
      });

      console.log(`Invoking Lambda function asynchronously: ${lambdaFunctionName} in region: ${lambdaRegion}`);
      console.log(`Job ID: ${jobId}`);
      
      // Fire and forget - Lambda will process in background
      await lambdaClient.send(invokeCommand).catch(async (error) => {
        console.error('Failed to invoke Lambda:', error);
        await updateJob(jobId, {
          status: 'failed',
          error: error.message || 'Failed to invoke Lambda function',
        });
        throw error;
      });

      // Return immediately with job ID for polling
      return NextResponse.json({
        jobId,
        status: 'processing',
        message: 'Scraping started. Polling for results...',
      });
    } catch (error: any) {
      console.error('Lambda invocation error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Provide helpful error messages
      if (error.name === 'ResourceNotFoundException' || error.message?.includes('Function not found')) {
        return NextResponse.json(
          {
            error: 'Lambda function not found',
            message: `Function "${lambdaFunctionName}" not found in region "${lambdaRegion}". Please verify the function name and region.`,
            details: 'See lambda/README.md for deployment instructions.',
            debug: {
              functionName: lambdaFunctionName,
              region: lambdaRegion,
              errorName: error.name,
              errorMessage: error.message,
            },
          },
          { status: 503 }
        );
      }

      if (error.name === 'UnrecognizedClientException' || 
          error.message?.includes('credentials') || 
          error.message?.includes('Could not load credentials') ||
          error.code === 'CredentialsError') {
        return NextResponse.json(
          {
            error: 'AWS credentials not available',
            message: 'The Amplify execution role needs permission to invoke Lambda functions.',
            details: 'See FIX_IAM_PERMISSIONS.md for IAM permissions setup.',
            debug: {
              errorName: error.name,
              errorCode: error.code,
              errorMessage: error.message,
              functionName: lambdaFunctionName,
              region: lambdaRegion,
              suggestion: 'Verify the IAM policy was added to the Amplify execution role and wait 1-2 minutes for permissions to propagate.',
            },
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: error.message || 'Failed to invoke Lambda function',
          details: error.toString(),
          debug: {
            errorName: error.name,
            errorCode: error.code,
            errorMessage: error.message,
            functionName: lambdaFunctionName,
            region: lambdaRegion,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error: 'Invalid request format',
        details: error.message,
      },
      { status: 400 }
    );
  }
}

