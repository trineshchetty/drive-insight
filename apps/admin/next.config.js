/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drive-insight/types', '@drive-insight/database'],
};

module.exports = nextConfig;
