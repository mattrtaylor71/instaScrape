export interface ProfileInfo {
  username: string;
  fullName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  postCount?: number;
  profileUrl: string;
  profilePicUrl?: string;
}

export interface PostInfo {
  id: string;
  url: string;
  caption?: string;
  timestamp?: string | Date;
  likeCount?: number;
  commentCount?: number;
  imageUrl?: string;
  shortcode?: string;
  comments?: CommentInfo[];
}

export interface CommentInfo {
  id: string;
  username: string;
  text: string;
  timestamp?: string | Date;
  likeCount?: number;
  replies?: CommentInfo[];
}

export interface ScrapedProfileResult {
  profile: ProfileInfo;
  posts: PostInfo[];
}

export interface ScrapedCommentsResult {
  postUrl: string;
  post?: PostInfo;
  comments: CommentInfo[];
}

export type ScrapeMode = "auto" | "profile" | "post";

export interface ScrapeRequest {
  url: string;
  mode?: ScrapeMode;
}

export interface ScrapeResponse {
  type: "profile" | "post";
  profile?: ScrapedProfileResult;
  post?: ScrapedCommentsResult;
  error?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskRequest {
  question: string;
  contextType: "profile" | "post" | "mixed";
  profileData?: ScrapedProfileResult;
  commentsData?: ScrapedCommentsResult;
  conversationHistory?: ConversationMessage[];
}

export interface AskResponse {
  answer: string;
  error?: string;
}

