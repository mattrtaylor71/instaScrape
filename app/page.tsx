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
        setLoadingMessage('✨ Gathering Instagram magic...');
        setLoadingProgress(5);
        // Start polling for results
        pollJobStatus(data.jobId);
      } else {
        // Synchronous response (shouldn't happen with async, but handle it)
        setLoadingProgress(100);
        setLoadingMessage('🎉 All done! Here we go...');
        setTimeout(() => {
          setScrapedData(data);
          setIsScraping(false);
          // Refresh credits after successful scrape
          fetchCredits();
        }, 800);
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
          setLoadingMessage('🎉 All done! Here we go...');
          setTimeout(() => {
            setScrapedData(data.result);
            setIsScraping(false);
            setJobId(null);
            // Refresh credits after successful scrape
            fetchCredits();
          }, 800);
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

        // Update progress with fun, non-technical messages
        const progress = Math.min(10 + (attempts * 2), 90);
        setLoadingProgress(progress);
        
        // Fun, consumer-friendly messages based on progress
        const messages = [
          { min: 0, max: 15, msg: '✨ Gathering Instagram magic...' },
          { min: 15, max: 30, msg: '📸 Collecting posts and stories...' },
          { min: 30, max: 50, msg: '💬 Reading all the comments...' },
          { min: 50, max: 70, msg: '🎨 Organizing everything beautifully...' },
          { min: 70, max: 85, msg: '🚀 Almost there! Final touches...' },
          { min: 85, max: 100, msg: '🎉 Almost ready! Just a moment...' },
        ];
        
        const currentMessage = messages.find(m => progress >= m.min && progress < m.max) || messages[messages.length - 1];
        setLoadingMessage(currentMessage.msg);

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
    // Proxy Instagram/Facebook CDN URLs (fbcdn.net is Facebook's CDN for Instagram)
    const urlLower = url.toLowerCase();
    if (urlLower.includes('cdninstagram.com') || 
        urlLower.includes('instagram.com') || 
        urlLower.includes('fbcdn.net')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Show access gate if no access
  if (!hasAccess) {
    return <AccessGate onAccessGranted={handleAccessGranted} />;
  }

  return (
    <div className="min-h-screen py-4 px-3 sm:py-8 sm:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with Credits */}
        <div className="text-center mb-6 sm:mb-12 animate-float">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold gradient-text px-2">
              Trepo Instagram Intelligence
            </h1>
            {credits !== null && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-lg shadow-lg animate-pulse-glow whitespace-nowrap">
                💰 {credits.toLocaleString()} Credits
              </div>
            )}
            {credits === null && (
              <div className="bg-gray-400 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-lg shadow-lg whitespace-nowrap">
                💰 Loading...
              </div>
            )}
          </div>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 font-medium px-2">
            Analyze Instagram profiles and posts with AI-powered insights
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Scrape Card */}
        <div className="glass rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border-2 border-white/30">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl">🔍</span>
            <span>Scrape Instagram Data</span>
          </h2>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                Instagram URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/username/ or https://www.instagram.com/p/SHORTCODE/"
                className="w-full px-3 py-3 sm:px-5 sm:py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-base sm:text-lg bg-white/90"
                disabled={isScraping}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                Scrape Mode
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                      className="mr-2 w-4 h-4 sm:w-5 sm:h-5 text-purple-600 focus:ring-purple-500"
                      disabled={isScraping}
                    />
                    <span className="text-sm sm:text-base text-gray-700 font-medium group-hover:text-purple-600 transition-colors capitalize">
                      {m === 'auto' ? 'Auto detect' : m}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleScrape}
              disabled={isScraping}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-3 px-4 sm:py-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl animate-pulse-glow"
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

            {/* Exciting Loading Animation */}
            {isScraping && (
              <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 animate-fade-in">
                {/* Main Progress Bar */}
                <div className="relative">
                  <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 rounded-full h-5 sm:h-6 overflow-hidden shadow-lg border-2 border-white/50">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  {/* Progress percentage badge */}
                  <div className="absolute -top-2 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 sm:px-4 sm:py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg transform transition-all duration-300"
                       style={{ right: `calc(${100 - loadingProgress}% - 30px)` }}>
                    {Math.round(loadingProgress)}%
                  </div>
                </div>

                {/* Fun Message */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl border-2 border-purple-200 shadow-lg">
                    <div className="text-2xl sm:text-3xl animate-bounce">✨</div>
                    <span className="text-sm sm:text-lg font-bold text-gray-800">{loadingMessage}</span>
                    <div className="text-2xl sm:text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
                  </div>
                </div>

                {/* Animated Icons */}
                <div className="flex justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
                  {['📸', '💬', '🎨', '🚀', '✨'].map((emoji, i) => (
                    <div
                      key={i}
                      className="text-2xl sm:text-4xl animate-float"
                      style={{ 
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '2s'
                      }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>

                {/* Pulsing dots */}
                <div className="flex justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse-glow"
                      style={{ 
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: '1.5s'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {scrapeError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 sm:px-5 sm:py-4 rounded-xl font-medium animate-pulse text-sm sm:text-base">
                ⚠️ {scrapeError}
              </div>
            )}
          </div>
        </div>

        {/* Scraped Data Display */}
        {scrapedData && !isScraping && (
          <div className="glass rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border-2 border-white/30 animate-float">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl">📊</span>
              <span>Scraped Data</span>
            </h2>

            {scrapedData.type === 'profile' && scrapedData.profile && (
              <div className="space-y-4 sm:space-y-6">
                {/* Profile Header */}
                <div className="border-b-2 border-purple-200 pb-4 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    {scrapedData.profile.profile.profilePicUrl && (
                      <img
                        src={getProxiedImageUrl(scrapedData.profile.profile.profilePicUrl)}
                        alt={scrapedData.profile.profile.username}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-purple-300 shadow-lg flex-shrink-0"
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
                    <div className="flex-1 text-center sm:text-left w-full">
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                        @{scrapedData.profile.profile.username}
                      </h3>
                      {scrapedData.profile.profile.fullName && (
                        <p className="text-lg sm:text-xl text-gray-600 font-medium mb-2">
                          {scrapedData.profile.profile.fullName}
                        </p>
                      )}
                      {scrapedData.profile.profile.bio && (
                        <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
                          {scrapedData.profile.profile.bio}
                        </p>
                      )}
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-4 sm:gap-6 text-xs sm:text-sm">
                        {scrapedData.profile.profile.followers !== undefined && (
                          <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-purple-700 whitespace-nowrap">
                            👥 {scrapedData.profile.profile.followers.toLocaleString()} followers
                          </span>
                        )}
                        {scrapedData.profile.profile.following !== undefined && (
                          <span className="bg-gradient-to-r from-blue-100 to-purple-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-blue-700 whitespace-nowrap">
                            ➕ {scrapedData.profile.profile.following.toLocaleString()} following
                          </span>
                        )}
                        {scrapedData.profile.profile.postCount !== undefined && (
                          <span className="bg-gradient-to-r from-pink-100 to-blue-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-pink-700 whitespace-nowrap">
                            📸 {scrapedData.profile.profile.postCount.toLocaleString()} posts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Posts List */}
                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Recent Posts</h4>
                  <div className="space-y-3 sm:space-y-4">
                    {scrapedData.profile.posts.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No posts found</p>
                    ) : (
                      scrapedData.profile.posts.map((post) => (
                        <div
                          key={post.id}
                          className="border-2 border-purple-200 rounded-xl p-3 sm:p-5 bg-white/50 hover:shadow-lg transition-all"
                        >
                          {post.imageUrl && (
                            <img
                              src={getProxiedImageUrl(post.imageUrl)}
                              alt="Post"
                              className="w-full rounded-lg mb-3 shadow-md"
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
                            <p className="text-sm sm:text-base text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                              {post.caption}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
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
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-purple-200">
                              <h5 className="text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                                💬 Comments ({post.comments.length})
                              </h5>
                              <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                                {post.comments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="text-xs sm:text-sm border-l-4 border-purple-300 pl-2 sm:pl-3 py-1.5 sm:py-2 bg-purple-50/50 rounded-r-lg"
                                  >
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                      <span className="font-bold text-purple-700">
                                        @{comment.username}
                                      </span>
                                      {comment.timestamp && (
                                        <span className="text-xs text-gray-500">
                                          {formatDate(comment.timestamp)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-700 break-words">{comment.text}</p>
                                    {comment.likeCount !== undefined && comment.likeCount > 0 && (
                                      <span className="text-xs text-gray-500">
                                        ❤️ {comment.likeCount} likes
                                      </span>
                                    )}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-2 ml-2 sm:ml-4 border-l-2 border-pink-300 pl-2 sm:pl-3">
                                        <p className="text-xs text-gray-500 mb-1">
                                          {comment.replies.length} replies
                                        </p>
                                        {comment.replies.map((reply) => (
                                          <div key={reply.id} className="mb-1">
                                            <span className="font-semibold text-xs text-pink-700">
                                              @{reply.username}
                                            </span>
                                            <p className="text-xs text-gray-700 break-words">{reply.text}</p>
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
              <div className="space-y-4 sm:space-y-6">
                {scrapedData.post.post && (
                  <div className="border-b-2 border-purple-200 pb-4 sm:pb-6">
                    <h3 className="text-xl sm:text-2xl font-bold mb-3">Post</h3>
                    {scrapedData.post.post.imageUrl && (
                      <img
                        src={getProxiedImageUrl(scrapedData.post.post.imageUrl)}
                        alt="Post"
                        className="w-full rounded-lg mb-3 shadow-md"
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
                      <p className="text-sm sm:text-base text-gray-700 mb-3 break-words">{scrapedData.post.post.caption}</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
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
                  <h4 className="text-xl sm:text-2xl font-bold mb-3">
                    💬 Comments ({scrapedData.post.comments.length})
                  </h4>
                  <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                    {scrapedData.post.comments.length === 0 ? (
                      <p className="text-gray-500 text-sm sm:text-base">No comments found</p>
                    ) : (
                      scrapedData.post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="border-2 border-purple-200 rounded-lg p-3 sm:p-4 bg-white/50"
                        >
                          <div className="flex flex-wrap items-start gap-2 mb-1">
                            <span className="font-bold text-purple-700 text-sm sm:text-base">
                              @{comment.username}
                            </span>
                            {comment.timestamp && (
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm sm:text-base text-gray-700 break-words">{comment.text}</p>
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
          <div className="glass rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <span className="text-3xl sm:text-4xl">🤖</span>
                <span>Ask AI</span>
              </h2>
              {conversationHistory.length > 0 && (
                <button
                  onClick={() => {
                    setConversationHistory([]);
                    setAiAnswer(null);
                    setQuestion('');
                  }}
                  className="text-xs sm:text-sm text-purple-600 hover:text-purple-800 font-semibold underline transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </div>

            {conversationHistory.length > 0 && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                <p className="text-xs text-gray-600 mb-2 font-semibold">
                  💭 Conversation history ({conversationHistory.length / 2} Q&A pairs)
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto text-xs sm:text-sm">
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
                      <span className="line-clamp-1 break-words">{msg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                  Ask a question about this {scrapedData.type}
                  {conversationHistory.length > 0 && (
                    <span className="text-xs text-purple-600 ml-2 font-normal block sm:inline">
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
                  className="w-full px-3 py-3 sm:px-5 sm:py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-base sm:text-lg bg-white/90 resize-none"
                  disabled={isAsking}
                />
              </div>

              <button
                onClick={handleAsk}
                disabled={isAsking}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 sm:py-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
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
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 sm:px-5 sm:py-4 rounded-xl font-medium text-sm sm:text-base">
                  ⚠️ {askError}
                </div>
              )}

              {aiAnswer && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 animate-float">
                  <h3 className="font-bold text-blue-900 mb-2 sm:mb-3 text-base sm:text-lg flex items-center gap-2">
                    <span>✨</span>
                    <span>AI Insight</span>
                  </h3>
                  <p className="text-sm sm:text-base text-blue-800 whitespace-pre-wrap leading-relaxed break-words">{aiAnswer}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
