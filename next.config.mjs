/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@mysten/sui"],
  },
};

export default nextConfig;
