import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check if environment variables are available
 * This helps diagnose issues with AWS Amplify environment variables
 */
export async function GET(request: NextRequest) {
  const hasApifyToken = !!process.env.APIFY_TOKEN;
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
  
  // Don't expose the actual values, just check if they exist
  const apifyTokenLength = process.env.APIFY_TOKEN?.length || 0;
  const openAiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
  
  return NextResponse.json({
    apifyToken: {
      exists: hasApifyToken,
      length: apifyTokenLength,
      preview: hasApifyToken ? `${process.env.APIFY_TOKEN?.substring(0, 10)}...` : 'NOT SET',
    },
    openAiKey: {
      exists: hasOpenAiKey,
      length: openAiKeyLength,
      preview: hasOpenAiKey ? `${process.env.OPENAI_API_KEY?.substring(0, 10)}...` : 'NOT SET',
    },
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('APIFY') || key.includes('OPENAI')
    ),
    nodeEnv: process.env.NODE_ENV,
  });
}

