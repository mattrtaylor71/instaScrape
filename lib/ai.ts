import OpenAI from 'openai';
import type { ScrapedProfileResult, ScrapedCommentsResult } from '@/types/instagram';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please set it in your .env.local file.'
    );
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Serialize profile data into context string for AI.
 */
function serializeProfileContext(profile: ScrapedProfileResult, maxPosts: number = 10): string {
  const lines: string[] = [];
  
  lines.push(`PROFILE INFORMATION:`);
  lines.push(`Username: ${profile.profile.username}`);
  if (profile.profile.fullName) lines.push(`Full Name: ${profile.profile.fullName}`);
  if (profile.profile.bio) lines.push(`Bio: ${profile.profile.bio}`);
  if (profile.profile.followers !== undefined) lines.push(`Followers: ${profile.profile.followers}`);
  if (profile.profile.following !== undefined) lines.push(`Following: ${profile.profile.following}`);
  if (profile.profile.postCount !== undefined) lines.push(`Total Posts: ${profile.profile.postCount}`);
  lines.push('');

  if (profile.posts.length > 0) {
    lines.push(`RECENT POSTS (showing latest ${Math.min(maxPosts, profile.posts.length)}):`);
    profile.posts.slice(0, maxPosts).forEach((post, idx) => {
      lines.push(`\nPost ${idx + 1}:`);
      if (post.caption) lines.push(`Caption: ${post.caption}`);
      if (post.timestamp) lines.push(`Date: ${post.timestamp}`);
      if (post.likeCount !== undefined) lines.push(`Likes: ${post.likeCount}`);
      if (post.commentCount !== undefined) lines.push(`Comments: ${post.commentCount}`);
      
      // Include comments if available
      if (post.comments && post.comments.length > 0) {
        lines.push(`\n  Comments on this post (${post.comments.length}):`);
        post.comments.slice(0, 50).forEach((comment, commentIdx) => {
          lines.push(`    ${commentIdx + 1}. @${comment.username}: ${comment.text}`);
          if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach((reply) => {
              lines.push(`      Reply by @${reply.username}: ${reply.text}`);
            });
          }
        });
        if (post.comments.length > 50) {
          lines.push(`    ... and ${post.comments.length - 50} more comments`);
        }
      }
    });
  }

  return lines.join('\n');
}

/**
 * Serialize comments data into context string for AI.
 */
function serializeCommentsContext(comments: ScrapedCommentsResult, maxComments: number = 200): string {
  const lines: string[] = [];
  
  if (comments.post) {
    lines.push(`POST INFORMATION:`);
    if (comments.post.caption) lines.push(`Caption: ${comments.post.caption}`);
    if (comments.post.timestamp) lines.push(`Date: ${comments.post.timestamp}`);
    if (comments.post.likeCount !== undefined) lines.push(`Likes: ${comments.post.likeCount}`);
    lines.push('');
  }

  if (comments.comments.length > 0) {
    lines.push(`COMMENTS (showing latest ${Math.min(maxComments, comments.comments.length)}):`);
    comments.comments.slice(0, maxComments).forEach((comment, idx) => {
      lines.push(`\nComment ${idx + 1} by @${comment.username}:`);
      lines.push(`${comment.text}`);
      if (comment.timestamp) lines.push(`Date: ${comment.timestamp}`);
      if (comment.likeCount !== undefined) lines.push(`Likes: ${comment.likeCount}`);
      
      if (comment.replies && comment.replies.length > 0) {
        lines.push(`Replies (${comment.replies.length}):`);
        comment.replies.forEach((reply, replyIdx) => {
          lines.push(`  Reply ${replyIdx + 1} by @${reply.username}: ${reply.text}`);
        });
      }
    });
  }

  return lines.join('\n');
}

/**
 * Answer a question using OpenAI with provided Instagram context.
 * Supports conversation history for follow-up questions.
 */
export async function answerQuestionFromContext(params: {
  question: string;
  profile?: ScrapedProfileResult;
  comments?: ScrapedCommentsResult;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const client = getOpenAIClient();
  const { question, profile, comments, conversationHistory = [] } = params;

  // Determine context type and build context string
  let contextString = '';
  const contextParts: string[] = [];

  if (profile) {
    contextParts.push(serializeProfileContext(profile));
  }

  if (comments) {
    contextParts.push(serializeCommentsContext(comments));
  }

  if (contextParts.length === 0) {
    throw new Error('No context data provided (profile or comments required)');
  }

  contextString = contextParts.join('\n\n---\n\n');

  // Build the system prompt
  const systemPrompt = `You are an assistant analyzing Instagram content (posts and comments). 
Your role is to:
- Answer questions based ONLY on the provided context
- Summarize and extract insights from the Instagram data
- Be concise and accurate
- Do NOT make up information that isn't in the context
- If the context doesn't contain enough information to answer, say so clearly
- You can reference previous questions and answers in the conversation to provide context-aware responses
- When a user asks a follow-up question, use the conversation history to understand what they're referring to

You will receive:
1. Conversation history (previous questions and answers)
2. A current user question
3. Context data containing Instagram profile information, post captions, and/or comments

Use only the provided context to answer the question, but leverage conversation history to understand follow-up questions.`;

  // Build messages array with conversation history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `CONTEXT:\n${contextString}` },
  ];

  // Add conversation history (previous Q&A pairs)
  if (conversationHistory.length > 0) {
    // Limit conversation history to last 10 messages to avoid token limits
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }

  // Add the current question
  messages.push({ role: 'user', content: question });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using a cost-effective model; can be changed to gpt-4 if needed
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('No response from OpenAI');
    }

    return answer;
  } catch (error: any) {
    console.error('Error calling OpenAI:', error);
    throw new Error(
      `Failed to get AI answer: ${error.message || 'Unknown error'}`
    );
  }
}

