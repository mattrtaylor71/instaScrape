/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove 'standalone' output - AWS Amplify handles this differently
  // For AWS Amplify SSR, we don't need standalone mode
  // output: 'standalone', // This might prevent env vars from being available at runtime
  
  // Configure serverless functions for AWS Amplify
  // This helps with Lambda timeout configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // AWS Amplify specific configuration
  // Note: Amplify may override some of these settings
  // For API routes, we need to configure Lambda timeout separately
};

module.exports = nextConfig;

