import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check if environment variables are available
 * This helps diagnose issues with AWS Amplify environment variables
 */
export async function GET(request: NextRequest) {
  const hasApifyToken = !!process.env.APIFY_TOKEN;
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
  const hasLambdaFunctionName = !!process.env.SCRAPE_LAMBDA_FUNCTION_NAME;
  const hasLambdaRegion = !!process.env.LAMBDA_REGION;
  
  // Don't expose the actual values, just check if they exist
  const apifyTokenLength = process.env.APIFY_TOKEN?.length || 0;
  const openAiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
  
  // Get ALL environment variables (for debugging)
  const allEnvKeys = Object.keys(process.env).sort();
  const relevantEnvKeys = allEnvKeys.filter(key => 
    key.includes('APIFY') || 
    key.includes('OPENAI') || 
    key.includes('AMPLIFY') ||
    key.includes('AWS') ||
    key.includes('LAMBDA')
  );
  
  // Check for common variations
  const variations = {
    'APIFY_TOKEN': process.env.APIFY_TOKEN ? 'EXISTS' : 'NOT SET',
    'NEXT_PUBLIC_APIFY_TOKEN': process.env.NEXT_PUBLIC_APIFY_TOKEN ? 'EXISTS' : 'NOT SET',
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? 'EXISTS' : 'NOT SET',
    'NEXT_PUBLIC_OPENAI_API_KEY': process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'EXISTS' : 'NOT SET',
    'SCRAPE_LAMBDA_FUNCTION_NAME': process.env.SCRAPE_LAMBDA_FUNCTION_NAME ? 'EXISTS' : 'NOT SET',
    'LAMBDA_REGION': process.env.LAMBDA_REGION ? 'EXISTS' : 'NOT SET',
  };
  
  return NextResponse.json({
    apifyToken: {
      exists: hasApifyToken,
      length: apifyTokenLength,
      preview: hasApifyToken ? `${process.env.APIFY_TOKEN?.substring(0, 10)}...` : 'NOT SET',
      value: process.env.APIFY_TOKEN || 'NOT SET',
    },
    openAiKey: {
      exists: hasOpenAiKey,
      length: openAiKeyLength,
      preview: hasOpenAiKey ? `${process.env.OPENAI_API_KEY?.substring(0, 10)}...` : 'NOT SET',
      value: process.env.OPENAI_API_KEY ? 'SET (hidden)' : 'NOT SET',
    },
    lambdaFunctionName: {
      exists: hasLambdaFunctionName,
      value: process.env.SCRAPE_LAMBDA_FUNCTION_NAME || 'NOT SET',
    },
    lambdaRegion: {
      exists: hasLambdaRegion,
      value: process.env.LAMBDA_REGION || 'NOT SET',
    },
    variations,
    relevantEnvVars: relevantEnvKeys,
    allEnvVarCount: allEnvKeys.length,
    nodeEnv: process.env.NODE_ENV,
    // Show first 20 env vars for debugging (excluding sensitive ones)
    sampleEnvVars: allEnvKeys
      .filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('token') && !k.toLowerCase().includes('secret'))
      .slice(0, 20)
      .reduce((acc, key) => {
        acc[key] = process.env[key]?.substring(0, 20) || '';
        return acc;
      }, {} as Record<string, string>),
  });
}

