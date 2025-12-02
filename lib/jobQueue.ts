/**
 * In-memory job queue for async scraping
 * Jobs are stored in memory and will be lost on server restart
 * For production, consider using DynamoDB or Redis
 */

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const jobs = new Map<string, Job>();

export function createJob(): string {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    createdAt: Date.now(),
  });
  return jobId;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, updates: Partial<Job>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    if (updates.status === 'completed' || updates.status === 'failed') {
      job.completedAt = Date.now();
    }
  }
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

// Clean up old completed jobs (older than 1 hour)
export function cleanupOldJobs(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.completedAt && job.completedAt < oneHourAgo) {
      jobs.delete(jobId);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldJobs, 10 * 60 * 1000);
}
