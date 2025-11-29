/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove 'standalone' output - AWS Amplify handles this differently
  // For AWS Amplify SSR, we don't need standalone mode
  // output: 'standalone', // This might prevent env vars from being available at runtime
};

module.exports = nextConfig;

