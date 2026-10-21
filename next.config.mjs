/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Wish photos are shrunk in the browser first; this is a safety margin.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
