/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drive-insight/types', '@drive-insight/database'],

  // API Proxy Configuration
  // Forwards /api/* requests to NestJS backend
  // This solves CORS issues and keeps frontend/backend on same origin
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // In Docker: api service name resolves to API container
        // In local dev: falls back to localhost:3001
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/:path*`
          : 'http://api:3000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
