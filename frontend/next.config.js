/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@science-map/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@science-map/shared'],
  },
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3004',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
