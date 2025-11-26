/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimized for serverless deployment
  // For AWS Amplify, use 'export' is not needed
  // For Lambda, standalone is better
};

module.exports = nextConfig;

