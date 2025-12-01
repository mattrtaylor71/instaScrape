/**
 * In-memory job queue for async scraping operations
 * 
 * This allows long-running scrapes to complete without hitting API route timeouts.
 * Jobs are stored in memory - they'll be lost on server restart.
 * For production, consider using SQS + DynamoDB.
 */

import type { ScrapeResponse } from '@/types/instagram';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScrapeJob {
  id: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ScrapeResponse;
  error?: string;
  progress?: {
    message: string;
    percent?: number;
  };
}

class JobQueue {
  private jobs: Map<string, ScrapeJob> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrentJobs = 2; // Process max 2 jobs at once

  /**
   * Create a new job and return its ID
   */
  createJob(): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: ScrapeJob = {
      id,
      status: 'pending',
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    return id;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ScrapeJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get total number of jobs (for debugging)
   */
  getJobCount(): number {
    return this.jobs.size;
  }

  /**
   * List all job IDs (for debugging)
   */
  listJobIds(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<ScrapeJob>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    Object.assign(job, updates);
    this.jobs.set(jobId, job);
  }

  /**
   * Start processing a job
   */
  async startJob(jobId: string, processor: () => Promise<ScrapeResponse>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Check if we're already at max concurrency
    if (this.processing.size >= this.maxConcurrentJobs) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.startJob(jobId, processor);
    }

    this.processing.add(jobId);
    this.updateJob(jobId, {
      status: 'processing',
      startedAt: new Date(),
      progress: { message: 'Starting scrape...', percent: 0 },
    });

    // Process in background (don't await)
    processor()
      .then((result) => {
        this.updateJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
          result,
          progress: { message: 'Completed!', percent: 100 },
        });
        this.processing.delete(jobId);
      })
      .catch((error: Error) => {
        this.updateJob(jobId, {
          status: 'failed',
          completedAt: new Date(),
          error: error.message || 'Unknown error',
          progress: { message: `Failed: ${error.message}`, percent: 0 },
        });
        this.processing.delete(jobId);
      });
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, message: string, percent?: number): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.progress = { message, percent };
    }
  }

  /**
   * Clean up old completed/failed jobs (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt.getTime() < oneHourAgo
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Cleanup old jobs every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    jobQueue.cleanup();
  }, 10 * 60 * 1000);
}

