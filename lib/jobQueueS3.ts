/**
 * S3-based job queue for async scraping
 * Jobs are stored in S3 and shared across all Lambda instances
 * This solves the serverless instance issue where in-memory state isn't shared
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// Initialize S3 client with proper region
const getS3Client = () => {
  const region = process.env.AWS_REGION || 
                 process.env.LAMBDA_REGION || 
                 process.env.AWS_DEFAULT_REGION || 
                 'us-east-1';
  
  return new S3Client({
    region,
  });
};

const s3Client = getS3Client();

// Get S3 bucket name from environment variable, or use default
const BUCKET_NAME = process.env.JOB_QUEUE_S3_BUCKET || 'instagram-scrape-jobs';
const PREFIX = 'jobs/';

// Log configuration on module load
console.log('S3 Job Queue initialized:', {
  bucket: BUCKET_NAME,
  region: process.env.AWS_REGION || process.env.LAMBDA_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  prefix: PREFIX,
});

/**
 * Get S3 key for a job
 */
function getJobKey(jobId: string): string {
  return `${PREFIX}${jobId}.json`;
}

/**
 * Create a new job in S3
 */
export async function createJob(): Promise<string> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const job: Job = {
    id: jobId,
    status: 'pending',
    createdAt: Date.now(),
  };

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: getJobKey(jobId),
        Body: JSON.stringify(job),
        ContentType: 'application/json',
      })
    );
    console.log(`Created job in S3: ${jobId}`);
    return jobId;
  } catch (error: any) {
    console.error('Failed to create job in S3:', error);
    throw new Error(`Failed to create job: ${error.message}`);
  }
}

/**
 * Get a job from S3
 */
export async function getJob(jobId: string): Promise<Job | undefined> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: getJobKey(jobId),
      })
    );

    if (!response.Body) {
      return undefined;
    }

    const bodyString = await response.Body.transformToString();
    const job = JSON.parse(bodyString) as Job;
    return job;
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      console.log(`Job not found in S3: ${jobId}`);
      return undefined;
    }
    console.error('Failed to get job from S3:', error);
    throw error;
  }
}

/**
 * Update a job in S3
 */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  try {
    // Get existing job
    const existingJob = await getJob(jobId);
    if (!existingJob) {
      console.warn(`Job not found for update: ${jobId}`);
      return;
    }

    // Merge updates
    const updatedJob: Job = {
      ...existingJob,
      ...updates,
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updatedJob.completedAt = Date.now();
    }

    // Save back to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: getJobKey(jobId),
        Body: JSON.stringify(updatedJob),
        ContentType: 'application/json',
      })
    );

    console.log(`Updated job in S3: ${jobId} (status: ${updatedJob.status})`);
  } catch (error: any) {
    console.error('Failed to update job in S3:', error);
    throw error;
  }
}

/**
 * Delete a job from S3
 */
export async function deleteJob(jobId: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: getJobKey(jobId),
      })
    );
    console.log(`Deleted job from S3: ${jobId}`);
  } catch (error: any) {
    console.error('Failed to delete job from S3:', error);
    // Don't throw - deletion is best effort
  }
}

/**
 * Create or update a job (useful for webhook that might create or update)
 */
export async function upsertJob(jobId: string, job: Partial<Job>): Promise<void> {
  try {
    const existingJob = await getJob(jobId);
    const fullJob: Job = existingJob
      ? { ...existingJob, ...job }
      : {
          id: jobId,
          status: job.status || 'pending',
          createdAt: job.createdAt || Date.now(),
          ...job,
        };

    if (fullJob.status === 'completed' || fullJob.status === 'failed') {
      fullJob.completedAt = Date.now();
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: getJobKey(jobId),
        Body: JSON.stringify(fullJob),
        ContentType: 'application/json',
      })
    );

    console.log(`Upserted job in S3: ${jobId} (status: ${fullJob.status})`);
  } catch (error: any) {
    console.error('Failed to upsert job in S3:', error);
    throw error;
  }
}

