import { NextRequest, NextResponse } from 'next/server';
import { scrapeProfileAndPostsByUrl, scrapePostCommentsByUrl } from '@/lib/instagramScraper';
import { jobQueue } from '@/lib/jobQueue';
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

    // Create async job
    const jobId = jobQueue.createJob();

    // Start processing in background
    jobQueue.startJob(jobId, async () => {
      jobQueue.updateProgress(jobId, 'Initializing scrape...', 5);

      if (scrapeType === 'profile') {
        jobQueue.updateProgress(jobId, 'Scraping profile data...', 10);
        const result = await scrapeProfileAndPostsByUrl(
          url,
          20,
          (message, percent) => jobQueue.updateProgress(jobId, message, percent)
        );
        jobQueue.updateProgress(jobId, 'Finalizing...', 95);
        
        const response: ScrapeResponse = {
          type: 'profile',
          profile: result,
        };
        return response;
      } else {
        jobQueue.updateProgress(jobId, 'Scraping post data...', 20);
        const result = await scrapePostCommentsByUrl(
          url,
          200,
          (message, percent) => jobQueue.updateProgress(jobId, message, percent)
        );
        jobQueue.updateProgress(jobId, 'Finalizing...', 95);
        
        const response: ScrapeResponse = {
          type: 'post',
          post: result,
        };
        return response;
      }
    });

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Scraping started. Poll /api/scrape/status/[jobId] for results.',
    });
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

