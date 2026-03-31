/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required to make Leaflet work with SSR
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
