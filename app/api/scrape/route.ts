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

    // Perform scraping with timeout handling
    if (scrapeType === 'profile') {
      try {
        const result = await scrapeProfileAndPostsByUrl(url);
        const response: ScrapeResponse = {
          type: 'profile',
          profile: result,
        };
        return NextResponse.json(response);
      } catch (error: any) {
        console.error('Profile scrape error:', error);
        
        // Check if it's a timeout error
        if (error.message?.includes('timeout') || error.message?.includes('504')) {
          return NextResponse.json(
            {
              error: 'Scraping timed out. This can happen with large profiles. Try a smaller profile or increase Lambda timeout in AWS Amplify Console.',
              details: 'The scraping operation took too long. AWS Lambda has a default timeout that may need to be increased.',
            },
            { status: 504 }
          );
        }
        
        return NextResponse.json(
          {
            error: error.message || 'Failed to scrape profile',
            details: error.toString(),
          },
          { status: 500 }
        );
      }
    } else {
      // Post scraping
      try {
        const result = await scrapePostCommentsByUrl(url);
        const response: ScrapeResponse = {
          type: 'post',
          post: result,
        };
        return NextResponse.json(response);
      } catch (error: any) {
        console.error('Post scrape error:', error);
        
        // Check if it's a timeout error
        if (error.message?.includes('timeout') || error.message?.includes('504')) {
          return NextResponse.json(
            {
              error: 'Scraping timed out. This can happen with posts that have many comments. Try increasing Lambda timeout in AWS Amplify Console.',
              details: 'The scraping operation took too long. AWS Lambda has a default timeout that may need to be increased.',
            },
            { status: 504 }
          );
        }
        
        return NextResponse.json(
          {
            error: error.message || 'Failed to scrape post',
            details: error.toString(),
          },
          { status: 500 }
        );
      }
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

