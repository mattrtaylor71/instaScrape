import { NextRequest, NextResponse } from 'next/server';
import { scrapeProfileAndPostsByUrl, scrapePostCommentsByUrl } from '@/lib/instagramScraper';
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

    // Process synchronously with progress updates
    // Note: In-memory job queue doesn't work across Lambda instances in Amplify
    // So we'll process synchronously but with progress callbacks for UI updates
    
    if (scrapeType === 'profile') {
      const result = await scrapeProfileAndPostsByUrl(
        url,
        20,
        (message, percent) => {
          // Progress updates are logged but can't be polled in serverless
          console.log(`Progress: ${percent}% - ${message}`);
        }
      );
      
      const response: ScrapeResponse = {
        type: 'profile',
        profile: result,
      };
      return NextResponse.json(response);
    } else {
      const result = await scrapePostCommentsByUrl(
        url,
        200,
        (message, percent) => {
          console.log(`Progress: ${percent}% - ${message}`);
        }
      );
      
      const response: ScrapeResponse = {
        type: 'post',
        post: result,
      };
      return NextResponse.json(response);
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

