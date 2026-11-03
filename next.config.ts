import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next",
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },
  webpack: (config) => {
    config.parallelism = 1;
    return config;
  },
  async redirects() {
    return [
      {
        source: "/how-it-works",
        destination: "/#how-it-works",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
