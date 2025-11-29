/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimized for serverless deployment
  // For AWS Amplify, use 'export' is not needed
  // For Lambda, standalone is better
  // Ensure .env.production is loaded
  env: {
    // These will be available at build time, but for runtime we need .env.production
  },
};

module.exports = nextConfig;

