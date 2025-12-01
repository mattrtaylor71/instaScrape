import { getApifyClient } from './apifyClient';
import type {
  ScrapedProfileResult,
  ScrapedCommentsResult,
  ProfileInfo,
  PostInfo,
  CommentInfo,
} from '@/types/instagram';

/**
 * Parse Instagram URL to determine if it's a profile or post URL.
 */
function parseInstagramUrl(url: string): { type: 'profile' | 'post'; identifier: string } {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading/trailing slashes and split
    const parts = pathname.replace(/^\/|\/$/g, '').split('/');

    // Profile URL: instagram.com/username/ or instagram.com/username
    if (parts.length === 1 || (parts.length === 2 && parts[1] === '')) {
      return { type: 'profile', identifier: parts[0] };
    }

    // Post URL: instagram.com/p/SHORTCODE/ or instagram.com/reel/SHORTCODE/
    if (parts[0] === 'p' || parts[0] === 'reel') {
      return { type: 'post', identifier: url };
    }

    // Default to profile if we can't determine
    return { type: 'profile', identifier: parts[0] };
  } catch (error) {
    throw new Error(`Invalid Instagram URL: ${url}`);
  }
}

/**
 * Extract username from profile URL.
 */
function extractUsername(url: string): string {
  const parsed = parseInstagramUrl(url);
  if (parsed.type === 'profile') {
    return parsed.identifier;
  }
  throw new Error('URL is not a profile URL');
}

/**
 * Scrape Instagram profile and recent posts.
 * 
 * Uses Apify Actor: apify/instagram-profile-scraper
 * 
 * This tool should only be used to analyze public Instagram data.
 * Users are responsible for complying with Instagram's Terms of Use and applicable laws.
 */
export async function scrapeProfileAndPostsByUrl(
  url: string,
  postsLimit: number = 10  // Reduced from 20 to 10 to avoid Lambda timeouts
): Promise<ScrapedProfileResult> {
  const client = getApifyClient();
  const username = extractUsername(url);

  try {
    // Use apify/instagram-profile-scraper
    // Actor ID can be changed - using the specific actor ID if provided
    // Default: 'apify/instagram-profile-scraper'
    // Alternative: 'dSCLg0C3YEZ83HzYX' (specific actor version)
    const actorId = 'apify/instagram-profile-scraper';

    const input = {
      usernames: [username],
      resultsLimit: postsLimit,
      resultsType: 'posts',
      // Some actors may also accept startUrls format
      // startUrls: [{ url: `https://www.instagram.com/${username}/` }],
    };

    console.log(`Starting Apify Actor ${actorId} for profile: ${username}`);
    const run = await client.actor(actorId).call(input);

    // Get results from the default dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      throw new Error(`No data returned from Apify for profile: ${username}`);
    }

    // Debug: log first item structure to understand the data format
    console.log('Sample item structure:', JSON.stringify(items[0], null, 2));

    // Find profile data (usually first item or item with profile info)
    const profileItem = items.find(
      (item: any) => item.type === 'Profile' || (item.username && !item.shortCode && !item.shortcode && !item.postUrl)
    ) || items[0];

    // Ensure username is always a string
    const profileUsername = (typeof profileItem.username === 'string' && profileItem.username) 
      ? profileItem.username 
      : username;
    
    const profile: ProfileInfo = {
      username: profileUsername,
      fullName: (typeof profileItem.fullName === 'string' ? profileItem.fullName : undefined) || 
                (typeof profileItem.full_name === 'string' ? profileItem.full_name : undefined),
      bio: (typeof profileItem.biography === 'string' ? profileItem.biography : undefined) || 
           (typeof profileItem.bio === 'string' ? profileItem.bio : undefined),
      followers: (typeof profileItem.followersCount === 'number' ? profileItem.followersCount : undefined) || 
                 (typeof profileItem.followers_count === 'number' ? profileItem.followers_count : undefined) || 
                 (typeof profileItem.followers === 'number' ? profileItem.followers : undefined),
      following: (typeof profileItem.followsCount === 'number' ? profileItem.followsCount : undefined) || 
                 (typeof profileItem.follows_count === 'number' ? profileItem.follows_count : undefined) || 
                 (typeof profileItem.following === 'number' ? profileItem.following : undefined),
      postCount: (typeof profileItem.postsCount === 'number' ? profileItem.postsCount : undefined) || 
                 (typeof profileItem.posts_count === 'number' ? profileItem.posts_count : undefined) || 
                 (typeof profileItem.posts === 'number' ? profileItem.posts : undefined),
      profileUrl: `https://www.instagram.com/${profileUsername}/`,
      profilePicUrl: (typeof profileItem.profilePicUrl === 'string' ? profileItem.profilePicUrl : undefined) || 
                     (typeof profileItem.profilePicUrlHD === 'string' ? profileItem.profilePicUrlHD : undefined) || 
                     (typeof profileItem.profile_pic_url === 'string' ? profileItem.profile_pic_url : undefined) || 
                     (typeof profileItem.profile_pic_url_hd === 'string' ? profileItem.profile_pic_url_hd : undefined),
    };

    // Extract posts from latestPosts array (nested in profile item) or from items
    let postsData: any[] = [];
    
    // Check if posts are nested in latestPosts
    if (profileItem.latestPosts && Array.isArray(profileItem.latestPosts)) {
      console.log(`Found ${profileItem.latestPosts.length} posts in latestPosts array`);
      postsData = profileItem.latestPosts;
    } 
    // Check if posts are in a posts array
    else if (profileItem.posts && Array.isArray(profileItem.posts)) {
      console.log(`Found ${profileItem.posts.length} posts in posts array`);
      postsData = profileItem.posts;
    }
    // Fallback: try to find posts in items array
    else {
      postsData = items.filter((item: any) => {
        // Exclude the profile item
        if (item === profileItem) return false;
        // Include if it has post-like properties
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

    const posts: PostInfo[] = postsData
      .slice(0, postsLimit)
      .map((item: any) => {
        // Extract comments if they're already in the post data
        let comments: CommentInfo[] = [];
        if (item.latestComments && Array.isArray(item.latestComments) && item.latestComments.length > 0) {
          comments = item.latestComments.map((comment: any) => ({
            id: comment.id || `${comment.username}-${comment.timestamp || Date.now()}`,
            username: comment.username || comment.ownerUsername || 'unknown',
            text: comment.text || comment.commentText || comment.comment || '',
            timestamp: comment.timestamp || comment.createdAt,
            likeCount: comment.likesCount || comment.likes_count || comment.likes,
            replies: comment.replies?.map((reply: any) => ({
              id: reply.id || `${reply.username}-${reply.timestamp || Date.now()}`,
              username: reply.username || reply.ownerUsername || 'unknown',
              text: reply.text || reply.commentText || reply.comment || '',
              timestamp: reply.timestamp || reply.createdAt,
              likeCount: reply.likesCount || reply.likes_count || reply.likes,
            })),
          }));
        }

        return {
          id: item.id || item.shortCode || item.shortcode || item.postId || `post-${Math.random()}`,
          url: item.url || item.postUrl || item.post_url || `https://www.instagram.com/p/${item.shortCode || item.shortcode}/`,
          caption: item.caption || item.text || item.postText || '',
          timestamp: item.timestamp || item.takenAtTimestamp || item.taken_at_timestamp || item.createdAt || item.takenAt,
          likeCount: item.likesCount || item.likes_count || item.likes || item.likeCount,
          commentCount: item.commentsCount || item.comments_count || item.comments || item.commentCount,
          imageUrl: item.displayUrl || item.imageUrl || item.image_url || item.display_url || item.thumbnailUrl,
          shortcode: item.shortCode || item.shortcode,
          comments: comments.length > 0 ? comments : undefined,
        };
      });

    console.log(`Extracted ${posts.length} posts from ${items.length} total items`);

    // Fetch additional comments for posts that don't have them yet
    console.log('Fetching additional comments for posts without comments...');
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        // If post already has comments, return it as-is
        if (post.comments && post.comments.length > 0) {
          console.log(`Post ${post.id} already has ${post.comments.length} comments, skipping fetch`);
          return post;
        }

        try {
          // Only fetch comments if we have a valid post URL and no comments yet
          if (!post.url || post.url.includes('post-')) {
            console.log(`Skipping comment fetch for post ${post.id} - invalid URL`);
            return post;
          }

          // Only fetch if commentCount suggests there should be comments
          if (post.commentCount === 0 || !post.commentCount) {
            console.log(`Post ${post.id} has no comments (count: ${post.commentCount}), skipping fetch`);
            return post;
          }

          console.log(`Fetching comments for post: ${post.url}`);
          const commentsResult = await scrapePostCommentsByUrl(post.url, 200);
          
          return {
            ...post,
            comments: commentsResult.comments,
          };
        } catch (error: any) {
          // If comment scraping fails, just log and continue with post without comments
          console.warn(`Failed to fetch comments for post ${post.url}:`, error.message);
          return post;
        }
      })
    );

    return { profile, posts: postsWithComments };
  } catch (error: any) {
    console.error('Error scraping Instagram profile:', error);
    throw new Error(
      `Failed to scrape Instagram profile: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Scrape comments for an Instagram post.
 * 
 * Uses Apify Actor: apify/instagram-comment-scraper
 * 
 * This tool should only be used to analyze public Instagram data.
 * Users are responsible for complying with Instagram's Terms of Use and applicable laws.
 */
export async function scrapePostCommentsByUrl(
  url: string,
  commentsLimit: number = 200
): Promise<ScrapedCommentsResult> {
  const client = getApifyClient();

  try {
    // Use apify/instagram-comment-scraper
    // Actor ID can be changed in the future if needed
    // Documentation: https://apify.com/apify/instagram-comment-scraper
    const actorId = 'apify/instagram-comment-scraper';

    const input = {
      directUrls: [url], // The actor requires 'directUrls' not 'postUrls'
      resultsLimit: commentsLimit,
    };

    console.log(`Starting Apify Actor ${actorId} for post: ${url}`);
    const run = await client.actor(actorId).call(input);

    // Get results from the default dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      throw new Error(`No comments returned from Apify for post: ${url}`);
    }

    // Extract post info if available (first item might be post metadata)
    const postItem = items.find((item: any) => item.type === 'Post' || item.postUrl);
    const post: PostInfo | undefined = postItem
      ? {
          id: (typeof postItem.id === 'string' ? postItem.id : undefined) || 
              (typeof postItem.shortcode === 'string' ? postItem.shortcode : '') || 
              `post-${Date.now()}`,
          url: (typeof postItem.url === 'string' ? postItem.url : undefined) || url,
          caption: typeof postItem.caption === 'string' ? postItem.caption : undefined,
          timestamp: (typeof postItem.timestamp === 'string' || postItem.timestamp instanceof Date) 
            ? postItem.timestamp 
            : undefined,
          likeCount: typeof postItem.likesCount === 'number' ? postItem.likesCount : undefined,
          commentCount: typeof postItem.commentsCount === 'number' ? postItem.commentsCount : undefined,
          imageUrl: (typeof postItem.displayUrl === 'string' ? postItem.displayUrl : undefined) || 
                    (typeof postItem.imageUrl === 'string' ? postItem.imageUrl : undefined),
          shortcode: typeof postItem.shortcode === 'string' ? postItem.shortcode : undefined,
        }
      : undefined;

    // Extract comments
    // According to Apify docs: https://apify.com/apify/instagram-comment-scraper
    // Output fields: id, postId, text, position, timestamp, ownerId, ownerIsVerified, ownerUsername, ownerProfilePicUrl
    const comments: CommentInfo[] = items
      .filter((item: any) => {
        // Filter for comment items - they should have text and ownerUsername
        return item.text && (item.ownerUsername || item.username);
      })
      .slice(0, commentsLimit)
      .map((item: any) => ({
        id: item.id || `${item.ownerUsername || item.username}-${item.timestamp || Date.now()}`,
        username: item.ownerUsername || item.username || 'unknown',
        text: item.text || '',
        timestamp: item.timestamp,
        likeCount: item.likesCount || item.likes_count || item.likes,
        // Replies might be in a different structure - check for nested replies
        replies: item.replies?.map((reply: any) => ({
          id: reply.id || `${reply.ownerUsername || reply.username}-${reply.timestamp || Date.now()}`,
          username: reply.ownerUsername || reply.username || 'unknown',
          text: reply.text || '',
          timestamp: reply.timestamp,
          likeCount: reply.likesCount || reply.likes_count || reply.likes,
        })),
      }));

    return {
      postUrl: url,
      post,
      comments,
    };
  } catch (error: any) {
    console.error('Error scraping Instagram comments:', error);
    throw new Error(
      `Failed to scrape Instagram comments: ${error.message || 'Unknown error'}`
    );
  }
}

