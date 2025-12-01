import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
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
    const lambdaFunctionName = process.env.SCRAPE_LAMBDA_FUNCTION_NAME || 'instagram-scrape-lambda-dev-scrape';
    const lambdaRegion = process.env.AWS_REGION || 'us-east-1';

    try {
      const lambdaClient = new LambdaClient({ region: lambdaRegion });
      
      const invokeCommand = new InvokeCommand({
        FunctionName: lambdaFunctionName,
        InvocationType: 'RequestResponse', // Synchronous invocation
        Payload: JSON.stringify({
          body: JSON.stringify({ url, mode }),
        }),
      });

      console.log(`Invoking Lambda function: ${lambdaFunctionName} in region: ${lambdaRegion}`);
      const lambdaResponse = await lambdaClient.send(invokeCommand);

      if (!lambdaResponse.Payload) {
        throw new Error('No response from Lambda function');
      }

      const responseText = new TextDecoder().decode(lambdaResponse.Payload);
      const lambdaResult = JSON.parse(responseText);

      if (lambdaResult.statusCode !== 200) {
        const errorBody = JSON.parse(lambdaResult.body || '{}');
        throw new Error(errorBody.error || 'Lambda function returned an error');
      }

      const result = JSON.parse(lambdaResult.body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Lambda invocation error:', error);
      
      // Fallback: If Lambda isn't configured, return helpful error
      if (error.name === 'ResourceNotFoundException' || error.message?.includes('Function not found')) {
        return NextResponse.json(
          {
            error: 'Lambda function not configured',
            message: 'Please deploy the Lambda function first. See lambda/README.md for instructions.',
            details: `Function name: ${lambdaFunctionName}, Region: ${lambdaRegion}`,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: error.message || 'Failed to invoke Lambda function',
          details: error.toString(),
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

