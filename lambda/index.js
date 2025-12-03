/**
 * AWS Lambda function handler for Instagram scraping
 * This function can run for up to 15 minutes (Lambda max timeout)
 */

const { ApifyClient } = require('apify-client');

// Initialize Apify client
function getApifyClient() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token });
}

// Extract username from Instagram URL
function extractUsername(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.replace(/^\/|\/$/g, '').split('/');
    return parts[0];
  } catch {
    throw new Error('Invalid Instagram URL');
  }
}

// Parse Instagram URL type
function parseInstagramUrl(url) {
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

// Scrape profile and posts
async function scrapeProfile(url, postsLimit = 5) {
  const client = getApifyClient();
  const username = extractUsername(url);
  const actorId = 'apify/instagram-profile-scraper';

  const input = {
    usernames: [username],
    resultsLimit: postsLimit,
    resultsType: 'posts',
  };

  console.log(`Starting Apify Actor ${actorId} for profile: ${username}`);
  const run = await client.actor(actorId).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  if (!items || items.length === 0) {
    throw new Error(`No data returned from Apify for profile: ${username}`);
  }

  // Find profile data
  const profileItem = items.find(
    (item) => item.type === 'Profile' || (item.username && !item.shortCode && !item.shortcode && !item.postUrl)
  ) || items[0];

  const profileUsername = (typeof profileItem.username === 'string' && profileItem.username)
    ? profileItem.username
    : username;

  const profile = {
    username: profileUsername,
    fullName: profileItem.fullName || profileItem.full_name,
    bio: profileItem.biography || profileItem.bio,
    followers: profileItem.followersCount || profileItem.followers_count || profileItem.followers,
    following: profileItem.followsCount || profileItem.follows_count || profileItem.following,
    postCount: profileItem.postsCount || profileItem.posts_count || profileItem.posts,
    profileUrl: `https://www.instagram.com/${profileUsername}/`,
    profilePicUrl: profileItem.profilePicUrl || profileItem.profilePicUrlHD || profileItem.profile_pic_url || profileItem.profile_pic_url_hd,
  };

  // Extract posts
  let postsData = [];
  if (profileItem.latestPosts && Array.isArray(profileItem.latestPosts)) {
    postsData = profileItem.latestPosts;
  } else if (profileItem.posts && Array.isArray(profileItem.posts)) {
    postsData = profileItem.posts;
  } else {
    postsData = items.filter((item) => {
      if (item === profileItem) return false;
      return item.type === 'Post' ||
        item.type === 'Image' ||
        item.type === 'Video' ||
        item.shortCode ||
        item.shortcode ||
        item.postUrl ||
        item.post_url ||
        (item.url && item.url.includes('/p/')) ||
        (item.url && item.url.includes('/reel/'));
    });
  }

  const posts = postsData.slice(0, postsLimit).map((item) => ({
    id: item.id || item.shortCode || item.shortcode || item.postId || `post-${Math.random()}`,
    url: item.url || item.postUrl || item.post_url || `https://www.instagram.com/p/${item.shortCode || item.shortcode}/`,
    caption: item.caption || item.text || item.postText || '',
    timestamp: item.timestamp || item.takenAtTimestamp || item.taken_at_timestamp || item.createdAt || item.takenAt,
    likeCount: item.likesCount || item.likes_count || item.likes || item.likeCount,
    commentCount: item.commentsCount || item.comments_count || item.comments || item.commentCount,
    imageUrl: item.displayUrl || item.imageUrl || item.image_url || item.display_url || item.thumbnailUrl,
    shortcode: item.shortCode || item.shortcode,
  }));

  // Fetch comments for all posts
  const postsWithComments = await Promise.all(
    posts.map(async (post) => {
      if (!post.url || post.url.includes('post-') || !post.commentCount || post.commentCount === 0) {
        return post;
      }

      try {
        console.log(`Fetching comments for post: ${post.url}`);
        // Fetch all comments (use a high limit to get all available)
        const commentsResult = await scrapePostComments(post.url, 1000);
        return {
          ...post,
          comments: commentsResult.comments,
        };
      } catch (error) {
        console.warn(`Failed to fetch comments for post ${post.url}:`, error.message);
        return post;
      }
    })
  );

  // All posts now have comments (or attempted to fetch them)
  return {
    profile,
    posts: postsWithComments,
  };
}

// Scrape post comments
async function scrapePostComments(url, commentsLimit = 1000) {
  const client = getApifyClient();
  const actorId = 'apify/instagram-comment-scraper';

  const input = {
    directUrls: [url],
    resultsLimit: commentsLimit,
  };

  console.log(`Starting Apify Actor ${actorId} for post: ${url}`);
  const run = await client.actor(actorId).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  if (!items || items.length === 0) {
    throw new Error(`No comments returned from Apify for post: ${url}`);
  }

  // Get all available comments (Apify respects resultsLimit, so we don't need to slice)
  const comments = items
    .filter((item) => item.text && (item.ownerUsername || item.username))
    .map((item) => ({
      id: item.id || `${item.ownerUsername || item.username}-${item.timestamp || Date.now()}`,
      username: item.ownerUsername || item.username || 'unknown',
      text: item.text || '',
      timestamp: item.timestamp,
      likeCount: item.likesCount || item.likes_count || item.likes,
      replies: item.replies?.map((reply) => ({
        id: reply.id || `${reply.ownerUsername || reply.username}-${reply.timestamp || Date.now()}`,
        username: reply.ownerUsername || reply.username || 'unknown',
        text: reply.text || '',
        timestamp: reply.timestamp,
        likeCount: reply.likesCount || reply.likes_count || reply.likes,
      })),
    }));

  return {
    postUrl: url,
    comments,
  };
}

// Lambda handler
exports.handler = async (event) => {
  console.log('Lambda scrape handler invoked:', JSON.stringify(event));

  try {
    // Extract jobId from event (top level) or from body
    const jobId = event.jobId || (event.body ? JSON.parse(event.body).jobId : null);
    const body = JSON.parse(event.body || '{}');
    const { url, mode = 'auto' } = body;
    
    console.log('Extracted jobId:', jobId);
    console.log('Extracted url:', url);
    console.log('Extracted mode:', mode);
    
    // If jobId is provided, we need to update the job status
    // But since we're in Lambda, we can't directly update the Next.js job queue
    // We'll return the result and the Next.js API route will update it
    // For now, we'll just process and return

    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Validate URL
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('instagram.com')) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'URL must be an Instagram URL' }),
        };
      }
    } catch {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid URL format' }),
      };
    }

    // Determine scrape type
    const scrapeType = mode === 'auto' ? parseInstagramUrl(url) : mode;

    let result;
    if (scrapeType === 'profile') {
      const profileResult = await scrapeProfile(url, 10);
      result = {
        type: 'profile',
        profile: profileResult,
      };
    } else {
      // Fetch all comments for single post
      const commentsResult = await scrapePostComments(url, 1000);
      result = {
        type: 'post',
        post: commentsResult,
      };
    }

    // If jobId is provided, POST results to webhook endpoint
    // This allows async Lambda invocation to update job status
    if (jobId) {
      try {
        // Get the webhook URL from environment or construct it
        // For Amplify, we need to POST to the deployed app's webhook endpoint
        // The webhook URL should be set as an environment variable in Lambda
        const webhookUrl = process.env.WEBHOOK_URL || 
          `https://main.d21qzkz6ya2vb7.amplifyapp.com/api/scrape/webhook`;
        
        console.log(`=== WEBHOOK CALL START ===`);
        console.log(`JobId: ${jobId}`);
        console.log(`Webhook URL: ${webhookUrl}`);
        console.log(`Result type: ${result?.type || 'unknown'}`);
        console.log(`Result keys: ${result ? Object.keys(result).join(', ') : 'none'}`);
        
        const axios = require('axios');
        const webhookPayload = {
          jobId,
          result,
        };
        
        console.log(`Webhook payload size: ${JSON.stringify(webhookPayload).length} bytes`);
        
        const response = await axios.post(webhookUrl, webhookPayload, {
          timeout: 30000, // 30 second timeout (increased from 10)
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`=== WEBHOOK SUCCESS ===`);
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data)}`);
      } catch (webhookError) {
        console.error(`=== WEBHOOK FAILED ===`);
        console.error(`Error name: ${webhookError.name}`);
        console.error(`Error message: ${webhookError.message}`);
        console.error(`Error code: ${webhookError.code}`);
        if (webhookError.response) {
          console.error(`Response status: ${webhookError.response.status}`);
          console.error(`Response data: ${JSON.stringify(webhookError.response.data)}`);
        }
        if (webhookError.request) {
          console.error(`Request made but no response received`);
          console.error(`Request config: ${JSON.stringify(webhookError.config)}`);
        }
        console.error(`Full error: ${JSON.stringify(webhookError, Object.getOwnPropertyNames(webhookError))}`);
        // Don't fail the Lambda if webhook fails - result is still valid
        // The frontend will poll and eventually timeout if webhook never succeeds
      }
    } else {
      console.log('No jobId provided - skipping webhook call (sync invocation)');
    }
    
    // Return result (for sync invocations or debugging)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Lambda error:', error);
    
    // If jobId is provided, notify webhook of failure
    // Extract jobId from event (top level) or from body
    const jobId = event.jobId || (event.body ? JSON.parse(event.body).jobId : null);
    
    if (jobId) {
      try {
        const webhookUrl = process.env.WEBHOOK_URL || 'https://main.d21qzkz6ya2vb7.amplifyapp.com/api/scrape/webhook';
        const axios = require('axios');
        await axios.post(webhookUrl, {
          jobId,
          error: {
            message: error.message || 'Failed to scrape Instagram',
            details: error.toString(),
          },
        });
      } catch (webhookError) {
        console.error('Failed to call webhook with error:', webhookError.message);
      }
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error.message || 'Failed to scrape Instagram',
        details: error.toString(),
      }),
    };
  }
};

