/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Remove trailing slash for cleaner URLs
  trailingSlash: false,
};

export default nextConfig;
