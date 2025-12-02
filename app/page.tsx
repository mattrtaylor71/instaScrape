'use client';

import { useState, useEffect } from 'react';
import AccessGate from '@/components/AccessGate';
import type {
  ScrapeResponse,
  ScrapedProfileResult,
  ScrapedCommentsResult,
  ScrapeMode,
  ConversationMessage,
} from '@/types/instagram';

export default function Home() {
  const [hasAccess, setHasAccess] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<ScrapeMode>('auto');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapeResponse | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  // Check access from localStorage (only on client side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAccess = localStorage.getItem('hasAccess');
      if (storedAccess === 'true') {
        setHasAccess(true);
      }
    }
  }, []);

  // Fetch credits when access is granted
  useEffect(() => {
    if (hasAccess) {
      fetchCredits();
    }
  }, [hasAccess]);

  // Fetch credits from API
  const fetchCredits = async () => {
    console.log('=== Frontend: fetchCredits called ===');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
      console.log('Step 1: Fetching from /api/credits...');
      const startTime = Date.now();
      
      const response = await fetch('/api/credits', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache busting
        cache: 'no-store',
      });
      
      const endTime = Date.now();
      console.log('Step 2: Received response');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Request duration:', `${(endTime - startTime) / 1000}s`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('ERROR: Response not OK');
        console.error('Status:', response.status, response.statusText);
        console.error('Error body:', errorText);
        setCredits(0);
        return;
      }
      
      console.log('Step 3: Parsing JSON response...');
      const data = await response.json();
      console.log('Step 4: Response data:', JSON.stringify(data, null, 2));
      console.log('Data type:', typeof data);
      console.log('Data keys:', Object.keys(data));
      
      if (data.credits !== undefined && data.credits !== null) {
        console.log('Step 5: Setting credits to:', data.credits);
        console.log('Credits type:', typeof data.credits);
        setCredits(data.credits);
      } else {
        console.warn('WARNING: Credits not in response data');
        console.warn('Available keys:', Object.keys(data));
        setCredits(0);
      }
      
      if (data.error) {
        console.error('ERROR: Credits API returned error');
        console.error('Error message:', data.error);
        console.error('Error details:', data.details);
      }
      
      if (data.success === false) {
        console.warn('WARNING: Credits API returned success: false');
        console.warn('Error:', data.error);
      }
      
      console.log('=== Frontend: fetchCredits completed ===');
    } catch (error: any) {
      console.error('=== ERROR in fetchCredits ===');
      console.error('Error type:', error?.constructor?.name || 'Unknown');
      console.error('Error message:', error?.message || 'Unknown error');
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', error);
      // Set to 0 if fetch fails
      setCredits(0);
    }
  };

  // Check environment variables on mount
  useEffect(() => {
    if (hasAccess) {
      // Check env vars for debugging
      fetch('/api/check-env')
        .then(res => res.json())
        .then(data => {
          console.log('Environment variables check:', data);
          if (!data.apifyToken.exists) {
            console.warn('⚠️ APIFY_TOKEN is not set! Redeploy required if you just added it.');
          }
        })
        .catch(err => console.error('Failed to check env vars:', err));
    }
  }, [hasAccess]);

  const handleAccessGranted = () => {
    setHasAccess(true);
    localStorage.setItem('hasAccess', 'true');
  };

  // Simulate loading progress during scraping (fallback if no real progress)
  useEffect(() => {
    if (isScraping && loadingProgress === 0) {
      // Only simulate if we don't have real progress yet
      const messages = [
        'Connecting to Instagram...',
        'Analyzing profile structure...',
        'Extracting posts and metadata...',
        'Gathering comments...',
        'Processing data...',
        'Almost done...',
      ];
      
      let progress = 0;
      let messageIndex = 0;
      
      const interval = setInterval(() => {
        // Stop simulating if we get real progress
        if (loadingProgress > 0) {
          clearInterval(interval);
          return;
        }
        
        progress += Math.random() * 10;
        if (progress > 50) progress = 50; // Cap at 50% until real progress comes
        
        if (progress > (messageIndex + 1) * 8 && messageIndex < messages.length - 1) {
          messageIndex++;
          setLoadingMessage(messages[messageIndex]);
        }
        
        setLoadingProgress(progress);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isScraping, loadingProgress]);

  const handleScrape = async () => {
    if (!url.trim()) {
      setScrapeError('Please enter an Instagram URL');
      return;
    }

    setIsScraping(true);
    setScrapeError(null);
    setScrapedData(null);
    setAiAnswer(null);
    setAskError(null);
    setConversationHistory([]);
    setLoadingProgress(0);
    setLoadingMessage('Starting scrape...');
    setJobId(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim(), mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Failed to start scrape (${response.status})`);
      }

      // Check if we got a jobId (async processing)
      if (data.jobId) {
        setJobId(data.jobId);
        setLoadingMessage('Scraping in progress...');
        // Start polling for results
        pollJobStatus(data.jobId);
      } else {
        // Synchronous response (shouldn't happen with async, but handle it)
        setLoadingProgress(100);
        setLoadingMessage('Complete!');
        setTimeout(() => {
          setScrapedData(data);
          setIsScraping(false);
          fetchCredits();
        }, 500);
      }
    } catch (error: any) {
      setScrapeError(error.message || 'An error occurred while scraping');
      setIsScraping(false);
      console.error('Scrape error:', error);
      setJobId(null);
    }
  };

  const pollJobStatus = async (id: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/scrape/status/${id}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setLoadingProgress(100);
          setLoadingMessage('Complete!');
          setTimeout(() => {
            setScrapedData(data.result);
            setIsScraping(false);
            setJobId(null);
            fetchCredits();
          }, 500);
          return;
        }

        if (data.status === 'failed') {
          setScrapeError(data.error || 'Scraping failed');
          setIsScraping(false);
          setJobId(null);
          return;
        }

        // Still processing
        attempts++;
        if (attempts >= maxAttempts) {
          setScrapeError('Scraping timed out. Please try again.');
          setIsScraping(false);
          setJobId(null);
          return;
        }

        // Update progress (rough estimate)
        const progress = Math.min(10 + (attempts * 2), 90);
        setLoadingProgress(progress);
        setLoadingMessage(`Scraping... (${attempts * 5}s)`);

        // Poll again in 5 seconds
        setTimeout(poll, 5000);
      } catch (error: any) {
        console.error('Polling error:', error);
        attempts++;
        if (attempts >= maxAttempts) {
          setScrapeError('Failed to check scraping status');
          setIsScraping(false);
          setJobId(null);
        } else {
          setTimeout(poll, 5000);
        }
      }
    };

    // Start polling
    poll();
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      setAskError('Please enter a question');
      return;
    }

    if (!scrapedData) {
      setAskError('Please scrape data first');
      return;
    }

    setIsAsking(true);
    setAskError(null);
    setAiAnswer(null);

    try {
      const currentQuestion = question.trim();
      
      const requestBody: any = {
        question: currentQuestion,
        contextType: scrapedData.type === 'profile' ? 'profile' : 'post',
        conversationHistory: conversationHistory,
      };

      if (scrapedData.profile) {
        requestBody.profileData = scrapedData.profile;
      }
      if (scrapedData.post) {
        requestBody.commentsData = scrapedData.post;
      }

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI answer');
      }

      const answer = data.answer;
      setAiAnswer(answer);

      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: answer },
      ]);

      setQuestion('');
      // Update credits after AI request (might use some)
      fetchCredits();
    } catch (error: any) {
      setAskError(error.message || 'An error occurred while asking');
      console.error('Ask error:', error);
    } finally {
      setIsAsking(false);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString();
    } catch {
      return String(date);
    }
  };

  // Helper function to proxy Instagram images through our API to bypass CORS
  const getProxiedImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // Only proxy Instagram CDN URLs
    if (url.includes('cdninstagram.com') || url.includes('instagram.com')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Show access gate if no access
  if (!hasAccess) {
    return <AccessGate onAccessGranted={handleAccessGranted} />;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with Credits */}
        <div className="text-center mb-12 animate-float">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-6xl font-extrabold gradient-text">
              Instagram Intelligence
            </h1>
            {credits !== null && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg animate-pulse-glow">
                💰 {credits.toLocaleString()} Credits
              </div>
            )}
            {credits === null && (
              <div className="bg-gray-400 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg">
                💰 Loading...
              </div>
            )}
          </div>
          <p className="text-xl text-gray-700 font-medium">
            Analyze Instagram profiles and posts with AI-powered insights
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Scrape Card */}
        <div className="glass rounded-2xl shadow-2xl p-8 mb-8 border-2 border-white/30">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-4xl">🔍</span>
            <span>Scrape Instagram Data</span>
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Instagram URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/username/ or https://www.instagram.com/p/SHORTCODE/"
                className="w-full px-5 py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-lg bg-white/90"
                disabled={isScraping}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Scrape Mode
              </label>
              <div className="flex gap-4 flex-wrap">
                {(['auto', 'profile', 'post'] as ScrapeMode[]).map((m) => (
                  <label
                    key={m}
                    className="flex items-center cursor-pointer group"
                  >
                    <input
                      type="radio"
                      value={m}
                      checked={mode === m}
                      onChange={(e) => setMode(e.target.value as ScrapeMode)}
                      className="mr-2 w-5 h-5 text-purple-600 focus:ring-purple-500"
                      disabled={isScraping}
                    />
                    <span className="text-gray-700 font-medium group-hover:text-purple-600 transition-colors capitalize">
                      {m === 'auto' ? 'Auto detect' : m}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleScrape}
              disabled={isScraping}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl animate-pulse-glow"
            >
              {isScraping ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scraping...
                </span>
              ) : (
                '🚀 Start Scraping'
              )}
            </button>

            {/* Loading Animation */}
            {isScraping && (
              <div className="mt-6 space-y-4">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-500 ease-out shimmer"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">{loadingMessage}</span>
                  <span className="text-purple-600 font-bold">{Math.round(loadingProgress)}%</span>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {scrapeError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium animate-pulse">
                ⚠️ {scrapeError}
              </div>
            )}
          </div>
        </div>

        {/* Scraped Data Display */}
        {scrapedData && !isScraping && (
          <div className="glass rounded-2xl shadow-2xl p-8 mb-8 border-2 border-white/30 animate-float">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-4xl">📊</span>
              <span>Scraped Data</span>
            </h2>

            {scrapedData.type === 'profile' && scrapedData.profile && (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="border-b-2 border-purple-200 pb-6">
                  <div className="flex items-start gap-6">
                    {scrapedData.profile.profile.profilePicUrl && (
                      <img
                        src={getProxiedImageUrl(scrapedData.profile.profile.profilePicUrl)}
                        alt={scrapedData.profile.profile.username}
                        className="w-24 h-24 rounded-full border-4 border-purple-300 shadow-lg"
                        onError={(e) => {
                          // Fallback to original URL if proxy fails
                          const target = e.target as HTMLImageElement;
                          const originalUrl = scrapedData.profile?.profile?.profilePicUrl;
                          if (originalUrl && target.src !== originalUrl) {
                            target.src = originalUrl;
                          }
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-800 mb-2">
                        @{scrapedData.profile.profile.username}
                      </h3>
                      {scrapedData.profile.profile.fullName && (
                        <p className="text-xl text-gray-600 font-medium mb-2">
                          {scrapedData.profile.profile.fullName}
                        </p>
                      )}
                      {scrapedData.profile.profile.bio && (
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {scrapedData.profile.profile.bio}
                        </p>
                      )}
                      <div className="flex gap-6 text-sm">
                        {scrapedData.profile.profile.followers !== undefined && (
                          <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-lg font-bold text-purple-700">
                            👥 {scrapedData.profile.profile.followers.toLocaleString()} followers
                          </span>
                        )}
                        {scrapedData.profile.profile.following !== undefined && (
                          <span className="bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-lg font-bold text-blue-700">
                            ➕ {scrapedData.profile.profile.following.toLocaleString()} following
                          </span>
                        )}
                        {scrapedData.profile.profile.postCount !== undefined && (
                          <span className="bg-gradient-to-r from-pink-100 to-blue-100 px-4 py-2 rounded-lg font-bold text-pink-700">
                            📸 {scrapedData.profile.profile.postCount.toLocaleString()} posts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Posts List */}
                <div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-4">Recent Posts</h4>
                  <div className="space-y-4">
                    {scrapedData.profile.posts.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No posts found</p>
                    ) : (
                      scrapedData.profile.posts.map((post) => (
                        <div
                          key={post.id}
                          className="border-2 border-purple-200 rounded-xl p-5 bg-white/50 hover:shadow-lg transition-all"
                        >
                          {post.imageUrl && (
                            <img
                              src={getProxiedImageUrl(post.imageUrl)}
                              alt="Post"
                              className="w-full max-w-md rounded-lg mb-3 shadow-md"
                              onError={(e) => {
                                // Fallback to original URL if proxy fails
                                const target = e.target as HTMLImageElement;
                                const originalUrl = post.imageUrl;
                                if (originalUrl && target.src !== originalUrl) {
                                  target.src = originalUrl;
                                }
                              }}
                            />
                          )}
                          {post.caption && (
                            <p className="text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                              {post.caption}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>{formatDate(post.timestamp)}</span>
                            {post.likeCount !== undefined && (
                              <span className="font-semibold text-pink-600">
                                ❤️ {post.likeCount.toLocaleString()} likes
                              </span>
                            )}
                            {post.commentCount !== undefined && (
                              <span className="font-semibold text-blue-600">
                                💬 {post.commentCount.toLocaleString()} comments
                              </span>
                            )}
                          </div>

                          {/* Comments Section */}
                          {post.comments && post.comments.length > 0 && (
                            <div className="mt-4 pt-4 border-t-2 border-purple-200">
                              <h5 className="text-sm font-bold text-gray-700 mb-3">
                                💬 Comments ({post.comments.length})
                              </h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {post.comments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="text-sm border-l-4 border-purple-300 pl-3 py-2 bg-purple-50/50 rounded-r-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-purple-700">
                                        @{comment.username}
                                      </span>
                                      {comment.timestamp && (
                                        <span className="text-xs text-gray-500">
                                          {formatDate(comment.timestamp)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-700">{comment.text}</p>
                                    {comment.likeCount !== undefined && comment.likeCount > 0 && (
                                      <span className="text-xs text-gray-500">
                                        ❤️ {comment.likeCount} likes
                                      </span>
                                    )}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-2 ml-4 border-l-2 border-pink-300 pl-3">
                                        <p className="text-xs text-gray-500 mb-1">
                                          {comment.replies.length} replies
                                        </p>
                                        {comment.replies.map((reply) => (
                                          <div key={reply.id} className="mb-1">
                                            <span className="font-semibold text-xs text-pink-700">
                                              @{reply.username}
                                            </span>
                                            <p className="text-xs text-gray-700">{reply.text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {scrapedData.type === 'post' && scrapedData.post && (
              <div className="space-y-6">
                {scrapedData.post.post && (
                  <div className="border-b-2 border-purple-200 pb-6">
                    <h3 className="text-2xl font-bold mb-3">Post</h3>
                    {scrapedData.post.post.imageUrl && (
                      <img
                        src={getProxiedImageUrl(scrapedData.post.post.imageUrl)}
                        alt="Post"
                        className="w-full max-w-md rounded-lg mb-3 shadow-md"
                        onError={(e) => {
                          // Fallback to original URL if proxy fails
                          const target = e.target as HTMLImageElement;
                          const originalUrl = scrapedData.post?.post?.imageUrl;
                          if (originalUrl && target.src !== originalUrl) {
                            target.src = originalUrl;
                          }
                        }}
                      />
                    )}
                    {scrapedData.post.post.caption && (
                      <p className="text-gray-700 mb-3">{scrapedData.post.post.caption}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{formatDate(scrapedData.post.post.timestamp)}</span>
                      {scrapedData.post.post.likeCount !== undefined && (
                        <span className="font-semibold text-pink-600">
                          ❤️ {scrapedData.post.post.likeCount.toLocaleString()} likes
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-2xl font-bold mb-3">
                    💬 Comments ({scrapedData.post.comments.length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scrapedData.post.comments.length === 0 ? (
                      <p className="text-gray-500">No comments found</p>
                    ) : (
                      scrapedData.post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="border-2 border-purple-200 rounded-lg p-4 bg-white/50"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="font-bold text-purple-700">
                              @{comment.username}
                            </span>
                            {comment.timestamp && (
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700">{comment.text}</p>
                          {comment.likeCount !== undefined && comment.likeCount > 0 && (
                            <span className="text-xs text-gray-500">
                              ❤️ {comment.likeCount} likes
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Q&A Panel */}
        {scrapedData && !isScraping && (
          <div className="glass rounded-2xl shadow-2xl p-8 border-2 border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="text-4xl">🤖</span>
                <span>Ask AI</span>
              </h2>
              {conversationHistory.length > 0 && (
                <button
                  onClick={() => {
                    setConversationHistory([]);
                    setAiAnswer(null);
                    setQuestion('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800 font-semibold underline transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </div>

            {conversationHistory.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                <p className="text-xs text-gray-600 mb-2 font-semibold">
                  💭 Conversation history ({conversationHistory.length / 2} Q&A pairs)
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto text-sm">
                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`${
                        msg.role === 'user' ? 'text-gray-700' : 'text-gray-600 italic'
                      }`}
                    >
                      <span className="font-bold">
                        {msg.role === 'user' ? 'Q: ' : 'A: '}
                      </span>
                      <span className="line-clamp-1">{msg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Ask a question about this {scrapedData.type}
                  {conversationHistory.length > 0 && (
                    <span className="text-xs text-purple-600 ml-2 font-normal">
                      (AI remembers previous questions)
                    </span>
                  )}
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    conversationHistory.length > 0
                      ? "Ask a follow-up question..."
                      : "e.g., Summarize the user's most recent posts about beverages."
                  }
                  rows={4}
                  className="w-full px-5 py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-lg bg-white/90 resize-none"
                  disabled={isAsking}
                />
              </div>

              <button
                onClick={handleAsk}
                disabled={isAsking}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {isAsking ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Asking AI...
                  </span>
                ) : (
                  '✨ Ask AI'
                )}
              </button>

              {askError && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium">
                  ⚠️ {askError}
                </div>
              )}

              {aiAnswer && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 animate-float">
                  <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                    <span>✨</span>
                    <span>AI Insight</span>
                  </h3>
                  <p className="text-blue-800 whitespace-pre-wrap leading-relaxed">{aiAnswer}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
